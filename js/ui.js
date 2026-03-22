import { addToCart, removeFromCart } from './cart.js';
import { toggleProductStatus, updateOrderStatus, deleteOrder } from './database.js';

export function init() {
    window.uiState = {
        toastTimeout: null
    };
}

export function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Client UI Renders
export function renderProducts(products, currentCart) {
    const list = document.getElementById('product-list');
    list.innerHTML = '';
    list.className = 'promo-grid';
    
    if(products.length === 0) {
        list.className = '';
        list.innerHTML = '<div class="empty-state"><p>No hay productos disponibles por ahora.</p></div>';
        return;
    }

    products.forEach(p => {
        let theme = 'theme-black';
        let tag = p.category;
        let title = p.name;
        let sub = p.desc;
        let imgSrc = '';

        if(p.name.includes("Pozole")) { theme = 'theme-ochre'; tag = "ORIGINAL"; title = "IMPOSIBLE COMERSE UN SOLO PLATO"; sub = "POZOL TOST"; imgSrc = "pozole.png"; }
        else if(p.name.includes("Refresco")) { theme = 'theme-red'; tag = "REFRESCO"; title = "NO ES POZOLE SIN UNA RICA COCA"; sub = "COKE TOST"; imgSrc = "cocacola.png"; }
        else if(p.name.includes("Agua")) { theme = 'theme-black'; tag = "TRADICIONAL"; title = "SI TE SIENTES FIT Y NO FAT"; sub = "UN AGUA LLEVAR"; imgSrc = "aguasabor.png"; }
        else if(p.name.includes("Tinga")) { theme = 'theme-red'; tag = "DELICIOSA"; title = "TOSTADA DE TINGA"; sub = "CRUJIENTE Y DELICIOSA"; imgSrc = "tostadatinga.png"; }
        else if(p.name.includes("Pata")) { theme = 'theme-ochre'; tag = "CLÁSICA"; title = "TOSTADA DE PATA"; sub = "LA DELICIA DE PATA"; imgSrc = "tostadapata.png"; }

        const card = document.createElement('div');
        card.className = `promo-card ${theme}`;
        card.innerHTML = `
            <div class="promo-content">
                <div class="promo-tag">${tag}</div>
                <div class="promo-title">${title}</div>
            <div class="promo-subtitle">${sub}</div>
        </div>
        ${imgSrc ? `<img src="img/${imgSrc}" class="promo-img" alt="${title}">` : ''}
        <div class="promo-price-tag">$${Number(p.price).toFixed(2)}</div>
        `;
        list.appendChild(card);
        
        card.addEventListener('click', () => openQtyModal(p));
    });
}

function openQtyModal(product) {
    const modal = document.getElementById('qty-modal');
    const nameEl = document.getElementById('modal-product-name');
    const priceEl = document.getElementById('modal-product-price');
    const qtyValEl = document.getElementById('modal-qty-val');
    const btnMinus = document.getElementById('modal-btn-minus');
    const btnPlus = document.getElementById('modal-btn-plus');
    const btnAdd = document.getElementById('modal-btn-add');

    nameEl.textContent = product.name;
    priceEl.textContent = `$${Number(product.price).toFixed(2)}`;
    
    let qty = 1;
    qtyValEl.textContent = qty;

    const newBtnMinus = btnMinus.cloneNode(true);
    const newBtnPlus = btnPlus.cloneNode(true);
    const newBtnAdd = btnAdd.cloneNode(true);
    btnMinus.parentNode.replaceChild(newBtnMinus, btnMinus);
    btnPlus.parentNode.replaceChild(newBtnPlus, btnPlus);
    btnAdd.parentNode.replaceChild(newBtnAdd, btnAdd);

    newBtnMinus.addEventListener('click', () => { if(qty > 1) { qty--; qtyValEl.textContent = qty; } });
    newBtnPlus.addEventListener('click', () => { qty++; qtyValEl.textContent = qty; });
    newBtnAdd.addEventListener('click', () => {
        for(let i=0; i<qty; i++) addToCart(product);
        showToast(`${qty}x ${product.name} agregado(s)`);
        modal.classList.add('hidden');
    });

    modal.classList.remove('hidden');
}

export function renderCart(cartItems) {
    const container = document.getElementById('cart-items');
    const emptyMsg = document.getElementById('cart-empty-message');
    const summary = document.getElementById('cart-summary');
    const totalPriceEl = document.getElementById('cart-total-price');
    
    container.innerHTML = '';
    
    if (cartItems.length === 0) {
        emptyMsg.classList.remove('hidden');
        summary.classList.add('hidden');
        return;
    }
    
    emptyMsg.classList.add('hidden');
    summary.classList.remove('hidden');
    
    let total = 0;
    
    cartItems.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title">${item.quantity}x ${item.name}</div>
                <div class="text-muted">$${Number(item.price).toFixed(2)} c/u</div>
            </div>
            <div class="cart-item-subtotal">
                $${Number(subtotal).toFixed(2)}
            </div>
            <button class="btn-icon" data-id="${item.id}" style="width:30px;height:30px;font-size:12px;margin-left:10px;color:var(--color-danger);">✖</button>
        `;
        container.appendChild(div);
        
        div.querySelector('.btn-icon').addEventListener('click', () => {
            // Remove completely
            for(let i=0; i<item.quantity; i++) removeFromCart(item.id);
            renderCart(import('./cart.js').then(m => m.getCart())); // dirty reload
            window.app.navigate('cart'); 
        });
    });
    
    totalPriceEl.textContent = `$${Number(total).toFixed(2)}`;
}

export function showCheckoutStep(stepNumber) {
    document.querySelectorAll('.checkout-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`checkout-step-${stepNumber}`).classList.add('active');
}

export function renderClientOrders(orders) {
    const list = document.getElementById('orders-list');
    list.innerHTML = '';
    
    if(orders.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>Aún no has realizado ningún pedido.</p></div>';
        return;
    }
    
    orders.forEach(o => {
        const date = new Date(o.createdAt).toLocaleString();
        let itemsHtml = o.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');
        
        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
            <div class="order-header">
                <span class="order-id">#${o.id.substring(0,6).toUpperCase()}</span>
                <span class="order-date">${date}</span>
            </div>
            <div class="order-items text-muted">${itemsHtml}</div>
            <div class="order-footer">
                <span class="order-total">$${Number(o.total).toFixed(2)}</span>
                <span class="badge status-${o.status.replace(/ /g, '')}">${o.status}</span>
            </div>
        `;
        list.appendChild(card);
    });
}

export function renderProfile(profile) {
    if(!profile) return;
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('profile-phone').textContent = profile.phone;
    document.getElementById('profile-email').textContent = profile.email;
    document.getElementById('profile-address').textContent = profile.address;
}

// Admin UI Renders
export function renderAdminOrders(orders) {
    const list = document.getElementById('admin-orders-list');
    list.innerHTML = '';
    
    if(orders.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No hay pedidos recientes.</p></div>';
        return;
    }
    
    orders.forEach(o => {
        const date = new Date(o.createdAt).toLocaleString();
        let itemsHtml = o.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');
        
        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
            <div class="order-header">
                <div>
                    <span class="order-id">#${o.id.substring(0,8).toUpperCase()}</span>
                    <br><span class="order-date">${date}</span>
                </div>
                <span class="order-total">$${Number(o.total).toFixed(2)}</span>
            </div>
            <div class="order-items text-muted" style="border-left: 3px solid var(--color-primary); padding-left: 10px; margin-bottom: 10px;">
                <strong>Cliente:</strong> ${o.customerParams?.name || 'N/A'}<br>
                <strong>Tel:</strong> <a href="tel:${o.customerParams?.phone}" style="color:var(--color-primary); text-decoration:none;">${o.customerParams?.phone || 'N/A'}</a><br>
                <strong>Dirección:</strong> ${o.deliveryParams?.address || 'N/A'}<br>
                ${(o.deliveryParams?.lat && o.deliveryParams?.lng) ? 
                    `<a href="https://www.google.com/maps/dir/?api=1&destination=${o.deliveryParams.lat},${o.deliveryParams.lng}" target="_blank" style="display:inline-block; margin-top:4px; margin-bottom:4px; font-weight:bold; color:#1a73e8; text-decoration:none;">📍 Abrir Navegación (GPS)</a><br>` 
                    : ''}
                <strong>Indicaciones extras:</strong> ${o.deliveryParams?.details || 'N/A'}<br>
                <strong>Pago:</strong> Efectivo ($${o.paymentParams?.cash}) - Cambio: $${o.paymentParams?.change}
            </div>
            <div class="order-items"><strong>Pedido:</strong><br>${itemsHtml}</div>
            <div class="admin-action" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <label>Estado Actual:</label>
                    <select class="status-selector" data-id="${o.id}">
                        <option value="Recibido" ${o.status === 'Recibido' ? 'selected' : ''}>Recibido</option>
                        <option value="En Preparacion" ${o.status === 'En Preparacion' ? 'selected' : ''}>En Preparación</option>
                        <option value="En Camino" ${o.status === 'En Camino' ? 'selected' : ''}>En Camino</option>
                        <option value="Entregado" ${o.status === 'Entregado' ? 'selected' : ''}>Entregado</option>
                    </select>
                </div>
                <button class="btn btn-delete-order" data-id="${o.id}" style="background:var(--color-danger); color:white; padding:8px 14px; border-radius:8px; border:none; cursor:pointer;" title="Eliminar Pedido">Borrar 🗑️</button>
            </div>
        `;
        list.appendChild(card);
        
        card.querySelector('.status-selector').addEventListener('change', async (e) => {
            const newStatus = e.target.value;
            const success = await updateOrderStatus(o.id, newStatus);
            if(success) showToast("Estado de pedido actualizado");
        });

        card.querySelector('.btn-delete-order').addEventListener('click', async (e) => {
            if(confirm("¿Estás seguro de que deseas eliminar este pedido permanentemente?")) {
                const success = await deleteOrder(o.id);
                if(success) {
                    showToast("Pedido eliminado");
                    window.app.navigate('admin-orders');
                } else {
                    showToast("Error al eliminar pedido");
                }
            }
        });
    });
}

export function renderAdminProducts(products) {
    const list = document.getElementById('admin-products-list');
    list.innerHTML = '';
    
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-info">
                <h3>${p.name}</h3>
                <div class="product-price">$${Number(p.price).toFixed(2)}</div>
            </div>
            <label class="switch">
                <input type="checkbox" class="product-toggle" data-id="${p.id}" ${p.active ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        list.appendChild(card);
        
        card.querySelector('.product-toggle').addEventListener('change', async (e) => {
            const success = await toggleProductStatus(p.id, !p.active);
            if(success) {
                showToast(`Producto ${e.target.checked ? 'Activado' : 'Desactivado'}`);
            } else {
                e.target.checked = !e.target.checked; // Revert if failed
                showToast("Error al actualizar");
            }
        });
    });
}
