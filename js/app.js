// Main Application Logic
import { auth } from './firebase-config.js';
import * as AuthLogic from './auth.js';
import * as UILogic from './ui.js';
import * as DBLogic from './db.js';
import * as CartLogic from './cart.js';
import * as MapLogic from './map.js';

// Global App State
const state = {
    user: null, // client or admin
    role: 'client', // client, admin
    currentView: 'loading',
    products: [],
    orders: []
};

// Application Router / View Manager
const App = {
    init() {
        console.log("App Initializing...");
        
        // Listen to Auth State Changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in.
                DBLogic.getUserRole(user.uid).then(role => {
                    state.user = user;
                    state.role = role || 'client';
                    
                    // Setup UI for logged in user
                    this.setupAuthenticatedUI();
                    
                    // Navigate to default view based on role
                    if(state.role === 'admin') {
                        this.navigate('admin-orders');
                    } else {
                        this.navigate('menu');
                    }
                });
            } else {
                // User is signed out.
                state.user = null;
                state.role = null;
                this.setupUnauthenticatedUI();
                this.navigate('auth');
            }
        });

        // Setup Event Listeners
        this.bindEvents();
    },

    navigate(viewId) {
        state.currentView = viewId;
        
        // Hide all views
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        
        // Show target view
        const targetView = document.getElementById(`view-${viewId}`);
        if(targetView) {
            targetView.classList.add('active');
        }

        // Update Navigation Bar highlighting
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-target="${viewId}"]`);
        if(activeNav) activeNav.classList.add('active');

        // View Specific Logic
        this.runViewLogic(viewId);
    },

    runViewLogic(viewId) {
        switch(viewId) {
            case 'menu':
                DBLogic.loadProducts().then(products => {
                    state.products = products;
                    UILogic.renderProducts(products, CartLogic.getCart());
                });
                break;
            case 'cart':
                UILogic.renderCart(CartLogic.getCart());
                break;
            case 'orders':
                if(state.user) {
                    DBLogic.loadUserOrders(state.user.uid).then(orders => {
                        UILogic.renderClientOrders(orders);
                    });
                }
                break;
            case 'profile':
                if(state.user) {
                    DBLogic.getUserProfile(state.user.uid).then(profile => {
                        UILogic.renderProfile(profile);
                    });
                }
                break;
            case 'admin-orders':
                DBLogic.loadAllOrders().then(orders => {
                    UILogic.renderAdminOrders(orders);
                });
                break;
            case 'admin-products':
                DBLogic.loadProductsAdmin().then(products => {
                    UILogic.renderAdminProducts(products);
                });
                break;
            case 'checkout':
                // Initialize map if it's step 1
                setTimeout(() => {
                    if(!MapLogic.isInitialized()) {
                       MapLogic.initMap('delivery-map');
                    }
                    MapLogic.invalidateSize();
                }, 100);
                break;
        }
    },

    setupAuthenticatedUI() {
        document.getElementById('main-header').classList.remove('hidden');
        
        if (state.role === 'admin') {
            document.getElementById('bottom-nav').classList.add('hidden');
            document.getElementById('admin-bottom-nav').classList.remove('hidden');
            document.getElementById('cart-badge-container').classList.add('hidden');
        } else {
            document.getElementById('bottom-nav').classList.remove('hidden');
            document.getElementById('admin-bottom-nav').classList.add('hidden');
            document.getElementById('cart-badge-container').classList.remove('hidden');
        }
    },

    setupUnauthenticatedUI() {
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('bottom-nav').classList.add('hidden');
        document.getElementById('admin-bottom-nav').classList.add('hidden');
    },

    bindEvents() {
        // Navigations
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.dataset.target;
                this.navigate(target);
            });
        });

        // Global Checkout Flow bindings mapping
        document.getElementById('btn-continue-checkout').addEventListener('click', () => {
            if(CartLogic.getCart().length === 0) {
                UILogic.showToast("El carrito está vacío");
                return;
            }
            this.navigate('checkout');
            UILogic.showCheckoutStep(1);
        });

        // We will expose navigate to window for inline onclicks in generated HTML
        window.app = {
            navigate: this.navigate.bind(this)
        };
    }
};

// Boot
window.addEventListener('DOMContentLoaded', () => {
    App.init();
    AuthLogic.init();
    CartLogic.init();
    UILogic.init();
});

export { App, state };
