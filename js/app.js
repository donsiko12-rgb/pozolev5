// Main Application Logic
import { auth } from './firebase-config.js';
import * as AuthLogic from './auth.js';
import * as UILogic from './ui.js';
import * as DBLogic from './database.js';
import * as CartLogic from './cart.js';
import * as MapLogic from './map-view.js';

// Global App State
const state = {
    user: null, // client or admin
    role: 'client', // client, admin
    currentView: 'loading',
    products: [],
    orders: [],
    storeOpen: true
};

// Application Router / View Manager
const App = {
    init() {
        console.log("App Initializing...");
        
        // Listen to Auth State Changes
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in.
                const role = await DBLogic.getUserRole(user.uid);
                const profile = await DBLogic.getUserProfile(user.uid);
                state.user = user;
                state.role = role || 'client';
                state.userProfile = profile;
                
                // Setup UI for logged in user
                this.setupAuthenticatedUI();
                
                // Navigate to default view based on role
                if(state.role === 'admin') {
                    this.navigate('admin-orders');
                } else {
                    this.navigate('menu');
                }
            } else {
                // User is signed out.
                state.user = null;
                state.role = null;
                this.setupUnauthenticatedUI();
                this.navigate('auth');
            }
        });

        // Listen to Store Status
        DBLogic.listenStoreStatus((isOpen) => {
            state.storeOpen = isOpen;
            
            const overlay = document.getElementById('store-closed-overlay');
            if(overlay) {
                if(!isOpen && state.role !== 'admin') {
                    overlay.classList.remove('hidden');
                    // auto boot checkout flow
                    if(state.currentView === 'checkout') {
                        this.navigate('cart');
                    }
                } else {
                    overlay.classList.add('hidden');
                }
            }

            // Sync Admin Toggle
            const adminBadge = document.getElementById('admin-store-status-badge');
            const adminSwitch = document.getElementById('admin-toggle-store');
            if(adminBadge && adminSwitch) {
                adminBadge.textContent = isOpen ? 'ABIERTA' : 'CERRADA';
                adminBadge.style.background = isOpen ? '#28a745' : '#dc3545';
                adminSwitch.checked = isOpen;
            }
        });

        // Setup Event Listeners
        this.bindEvents();

        // Auto Refresh every 10 seconds
        setInterval(() => {
            const autoRefreshViews = ['menu', 'orders', 'admin-orders', 'admin-products'];
            if (state.currentView && autoRefreshViews.includes(state.currentView)) {
                // Prevent interrupting the admin if they are currently clicking a state Dropdown or interacting with an input
                const activeEl = document.activeElement;
                if(activeEl && (activeEl.tagName === 'SELECT' || activeEl.tagName === 'INPUT')) {
                    return; 
                }
                this.runViewLogic(state.currentView);
            }
        }, 10000);
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

        // Header Cart Button binding
        const headerCartBtn = document.getElementById('cart-badge-container');
        if(headerCartBtn) {
            headerCartBtn.addEventListener('click', () => {
                this.navigate('cart');
            });
        }

        // Global Checkout Flow bindings mapping
        document.getElementById('btn-continue-checkout').addEventListener('click', () => {
            if(!state.storeOpen && state.role !== 'admin') {
                UILogic.showToast("Lo sentimos, la tienda está cerrada ahora.");
                return;
            }

            if(CartLogic.getCart().length === 0) {
                UILogic.showToast("El carrito está vacío");
                return;
            }
            this.navigate('checkout');
            UILogic.showCheckoutStep(1);
        });

        // Store Admin Toggle binding
        const storeToggle = document.getElementById('admin-toggle-store');
        if(storeToggle) {
            storeToggle.addEventListener('change', async (e) => {
                const targetState = e.target.checked;
                e.target.disabled = true;
                const success = await DBLogic.toggleStoreStatus(state.storeOpen);
                if(!success) {
                    e.target.checked = state.storeOpen;
                    UILogic.showToast("Error al cambiar estado de la tienda");
                }
                e.target.disabled = false;
            });
        }

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
