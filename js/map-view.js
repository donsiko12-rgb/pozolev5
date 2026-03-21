import { getCart, getCartTotal, clearCart } from './cart.js';
import { placeOrder } from './database.js';
import { showToast, showCheckoutStep } from './ui.js';
import { state } from './app.js';

let map = null;
let marker = null;
let currentPos = { lat: 19.4326, lng: -99.1332 }; // default CDMX
let initialized = false;

// Delivery Params
const orderParams = {
    delivery: { lat: 0, lng: 0, address: '', details: '' },
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
            });
        }
    });

    // Step 1 -> Step 2
    document.getElementById('btn-checkout-next-1').addEventListener('click', () => {
        const details = document.getElementById('delivery-address-details').value;
        orderParams.delivery.lat = currentPos.lat;
        orderParams.delivery.lng = currentPos.lng;
        orderParams.delivery.details = details;
        
        if(!orderParams.delivery.address) {
             orderParams.delivery.address = "Ubicación en GPS ("+currentPos.lat.toFixed(4)+","+currentPos.lng.toFixed(4)+")";
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
        const btn = document.getElementById('btn-confirm-order');
        btn.disabled = true;
        btn.textContent = "Procesando...";
        
        const cartItems = getCart();
        const finalOrder = {
            userId: state.user.uid,
            customerParams: {
                name: document.getElementById('profile-name')?.textContent || 'Cliente',
                phone: document.getElementById('profile-phone')?.textContent || 'S/N',
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
            }, 1000);

        } catch(e) {
            showToast("Hubo un error al procesar el pedido.");
            btn.disabled = false;
            btn.textContent = "Reintentar";
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
    let addrHtml = `<strong>${orderParams.delivery.address}</strong>`;
    if(orderParams.delivery.details) {
        addrHtml += `<br><small class="text-muted">Ref: ${orderParams.delivery.details}</small>`;
    }
    document.getElementById('checkout-summary-address').innerHTML = addrHtml;

    // Payment
    document.getElementById('checkout-summary-cash').textContent = `$${Number(orderParams.payment.cash).toFixed(2)}`;
    document.getElementById('checkout-summary-change').textContent = `$${Number(orderParams.payment.change).toFixed(2)}`;
    document.getElementById('checkout-summary-total').textContent = `$${Number(getCartTotal()).toFixed(2)}`;
}
