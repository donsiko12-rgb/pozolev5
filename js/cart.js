let cart = [];

export function init() {
    // Load cart from local storage if needed, or keep in memory
    const savedCart = localStorage.getItem('pozole_cart');
    if(savedCart) {
        try {
            cart = JSON.parse(savedCart);
            updateCartBadge();
        } catch(e) {}
    }
}

export function getCart() {
    return cart;
}

export function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if(existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateCartBadge();
}

export function removeFromCart(productId) {
    const existingIndex = cart.findIndex(item => item.id === productId);
    if(existingIndex > -1) {
        cart[existingIndex].quantity -= 1;
        if(cart[existingIndex].quantity <= 0) {
            cart.splice(existingIndex, 1);
        }
    }
    saveCart();
    updateCartBadge();
}

export function clearCart() {
    cart = [];
    saveCart();
    updateCartBadge();
}

export function getCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function saveCart() {
    localStorage.setItem('pozole_cart', JSON.stringify(cart));
}

export function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if(badge) {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = count;
        
        // Pop animation
        badge.style.animation = 'none';
        badge.offsetHeight; /* trigger reflow */
        badge.style.animation = null; 
    }
}
