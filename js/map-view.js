import { getCart, getCartTotal, clearCart } from './cart.js';
import { placeOrder } from './database.js';
import { showToast, showCheckoutStep } from './ui.js';
import { state } from './app.js';

let map = null;
let marker = null;
let currentPos = { lat: 19.4326, lng: -99.1332 }; // default CDMX
let initialized = false;
let isProcessingOrder = false;
let orderType = 'delivery'; // 'delivery' or 'pickup'

// Delivery Params
const orderParams = {
    delivery: { type: 'delivery', pickupTime: '', lat: 0, lng: 0, address: '', details: '' },
    payment: { cash: 0, change: 0 }
};

export function isInitialized() {
    return initialized && map !== null;
}

export function initMap(containerId) {
    if (initialized) return;

    // Default map to Mexico City center
    map = L.map(containerId).setView([currentPos.lat, currentPos.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker([currentPos.lat, currentPos.lng], { draggable: true }).addTo(map);

    marker.on('dragend', function (e) {
        currentPos = marker.getLatLng();
        updateAddressFromCoords(currentPos.lat, currentPos.lng);
    });

    map.on('click', function (e) {
        currentPos = e.latlng;
        marker.setLatLng(currentPos);
        updateAddressFromCoords(currentPos.lat, currentPos.lng);
    });

    // Try to get user GPS location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            currentPos = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setView([currentPos.lat, currentPos.lng], 16);
            marker.setLatLng(currentPos);
            updateAddressFromCoords(currentPos.lat, currentPos.lng);
        }, (error) => {
            console.warn("GPS Init Error", error);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    }

    bindCheckoutEvents();
    initialized = true;
}

export function invalidateSize() {
    if(map) map.invalidateSize();
}

async function updateAddressFromCoords(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        if(data && data.display_name) {
            orderParams.delivery.address = data.display_name;
        } else {
            orderParams.delivery.address = "Ubicación seleccionada en mapa";
        }
    } catch(e) {
        orderParams.delivery.address = "Ubicación seleccionada en mapa";
    }
}

function bindCheckoutEvents() {
    // Step 1: GPS Button
    document.getElementById('btn-gps').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                currentPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                map.setView([currentPos.lat, currentPos.lng], 16);
                marker.setLatLng(currentPos);
                updateAddressFromCoords(currentPos.lat, currentPos.lng);
                showToast("Ubicación actualizada");
            }, () => {
                showToast("No se pudo obtener la ubicación GPS");
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    });

    // Option toggles
    document.getElementById('btn-opt-delivery').addEventListener('click', (e) => {
        orderType = 'delivery';
        e.target.classList.add('active');
        e.target.style.borderColor = 'var(--color-primary)';
        e.target.style.color = 'var(--color-primary)';
        
        const pickupBtn = document.getElementById('btn-opt-pickup');
        pickupBtn.classList.remove('active');
        pickupBtn.style.borderColor = '';
        pickupBtn.style.color = '';
        
        document.getElementById('delivery-fields').classList.remove('hidden');
        document.getElementById('pickup-fields').classList.add('hidden');
        setTimeout(() => invalidateSize(), 100);
    });

    document.getElementById('btn-opt-pickup').addEventListener('click', (e) => {
        orderType = 'pickup';
        e.target.classList.add('active');
        e.target.style.borderColor = 'var(--color-primary)';
        e.target.style.color = 'var(--color-primary)';
        
        const deliveryBtn = document.getElementById('btn-opt-delivery');
        deliveryBtn.classList.remove('active');
        deliveryBtn.style.borderColor = '';
        deliveryBtn.style.color = '';
        
        document.getElementById('delivery-fields').classList.add('hidden');
        document.getElementById('pickup-fields').classList.remove('hidden');
    });

    // Step 1 -> Step 2
    document.getElementById('btn-checkout-next-1').addEventListener('click', () => {
        if(orderType === 'delivery') {
            const details = document.getElementById('delivery-address-details').value;
            orderParams.delivery.type = 'delivery';
            orderParams.delivery.lat = currentPos.lat;
            orderParams.delivery.lng = currentPos.lng;
            orderParams.delivery.details = details;
            
            if(!orderParams.delivery.address) {
                 orderParams.delivery.address = "Ubicación en GPS ("+currentPos.lat.toFixed(4)+","+currentPos.lng.toFixed(4)+")";
            }
        } else {
            const time = document.getElementById('pickup-time').value;
            if(!time) {
                showToast("Por favor, selecciona a qué hora pasarás por tu pedido");
                return;
            }
            
            // Validate time between 14:00 and 22:00
            const timeParts = time.split(':');
            const hours = parseInt(timeParts[0], 10);
            const mins = parseInt(timeParts[1], 10);
            if (hours < 14 || hours > 22 || (hours === 22 && mins > 0)) {
                showToast("El horario de recolección es de 14:00 a 22:00 hrs, intenta de nuevo.");
                return;
            }

            orderParams.delivery.type = 'pickup';
            orderParams.delivery.pickupTime = time;
            orderParams.delivery.address = "Pasar a Recoger";
            orderParams.delivery.details = '';
        }

        const total = getCartTotal();
        document.getElementById('checkout-total-display').textContent = `$${Number(total).toFixed(2)}`;
        
        showCheckoutStep(2);
    });

    // Step 2 -> Prev
    document.getElementById('btn-checkout-prev-2').addEventListener('click', () => {
        showCheckoutStep(1);
    });

    // Cash Input Logic
    const cashInput = document.getElementById('payment-cash');
    const changeHint = document.getElementById('payment-change-hint');
    
    cashInput.addEventListener('input', (e) => {
        const total = getCartTotal();
        const cashValue = parseFloat(e.target.value);
        if(!isNaN(cashValue) && cashValue >= total) {
            changeHint.textContent = `Su cambio será de $${Number(cashValue - total).toFixed(2)}`;
            changeHint.style.color = 'var(--color-primary)';
        } else {
            changeHint.textContent = 'La cantidad debe ser mayor o igual al total.';
            changeHint.style.color = 'var(--color-danger)';
        }
    });

    // Step 2 -> Step 3
    document.getElementById('btn-checkout-next-2').addEventListener('click', () => {
        const total = getCartTotal();
        const cash = parseFloat(document.getElementById('payment-cash').value);
        
        if(isNaN(cash) || cash < total) {
            showToast("Indica una cantidad válida para pagar");
            return;
        }

        orderParams.payment.cash = cash;
        orderParams.payment.change = cash - total;

        populateSummary();
        showCheckoutStep(3);
    });
    
    // Step 3 -> Prev
    document.getElementById('btn-checkout-prev-3').addEventListener('click', () => {
        showCheckoutStep(2);
    });

    // Confirm Order
    document.getElementById('btn-confirm-order').addEventListener('click', async () => {
        if (isProcessingOrder) return;
        isProcessingOrder = true;

        const btn = document.getElementById('btn-confirm-order');
        btn.disabled = true;
        btn.textContent = "Procesando...";
        
        const cartItems = getCart();
        const finalOrder = {
            userId: state.user.uid,
            customerParams: {
                name: state.userProfile?.name || 'Cliente',
                phone: state.userProfile?.phone || 'S/N',
            },
            items: cartItems,
            total: getCartTotal(),
            deliveryParams: orderParams.delivery,
            paymentParams: orderParams.payment
        };

        try {
            await placeOrder(finalOrder);
            showToast("¡Pedido confirmado con éxito!");
            clearCart();
            document.getElementById('payment-cash').value = '';
            document.getElementById('delivery-address-details').value = '';
            
            // Return to orders view
            setTimeout(() => {
                window.app.navigate('orders');
                btn.disabled = false;
                btn.textContent = "¡Confirmar Pedido!";
                isProcessingOrder = false;
            }, 1000);

        } catch(e) {
            showToast("Hubo un error al procesar el pedido.");
            btn.disabled = false;
            btn.textContent = "Reintentar";
            isProcessingOrder = false;
        }
    });
}

function populateSummary() {
    // Items
    const summaryItems = document.getElementById('checkout-summary-items');
    summaryItems.innerHTML = '';
    getCart().forEach(i => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${i.quantity}x ${i.name}</span> <span>$${Number(i.price * i.quantity).toFixed(2)}</span>`;
        summaryItems.appendChild(li);
    });

    // Delivery
    let addrHtml = '';
    if(orderParams.delivery.type === 'pickup') {
        addrHtml = `<strong>🛍️ Pasar a Recoger</strong><br>Hora: ${orderParams.delivery.pickupTime}`;
    } else {
        addrHtml = `<strong>🏍️ A Domicilio:</strong><br>${orderParams.delivery.address}`;
        if(orderParams.delivery.details) {
            addrHtml += `<br><small class="text-muted">Ref: ${orderParams.delivery.details}</small>`;
        }
    }
    document.getElementById('checkout-summary-address').innerHTML = addrHtml;

    // Payment
    document.getElementById('checkout-summary-cash').textContent = `$${Number(orderParams.payment.cash).toFixed(2)}`;
    document.getElementById('checkout-summary-change').textContent = `$${Number(orderParams.payment.change).toFixed(2)}`;
    document.getElementById('checkout-summary-total').textContent = `$${Number(getCartTotal()).toFixed(2)}`;
}
