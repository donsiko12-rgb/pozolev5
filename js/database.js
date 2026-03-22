import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    addDoc, 
    query, 
    where, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Fetch User Role
export async function getUserRole(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            return docSnap.data().role;
        }
        return 'client';
    } catch (e) {
        console.error("Error getting user role", e);
        return 'client';
    }
}

// Fetch User Profile
export async function getUserProfile(uid) {
    try {
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (e) {
        console.error("Error getting user profile", e);
        return null;
    }
}

// Helper to get static products
function getStaticProducts() {
    return [
        { id: "p1", name: "Pozole Grande", price: 120, category: "Pozole", desc: "Porción de 1 litro con maciza o surtida.", active: true },
        { id: "p2", name: "Pozole Chico", price: 90, category: "Pozole", desc: "Porción de 500ml, ideal para el antojo.", active: true },
        { id: "p3", name: "Tostada de Tinga", price: 35, category: "Complementos", desc: "Crujiente y deliciosa. Este complemento no debe faltar.", active: true },
        { id: "p4", name: "Tostada de Pata", price: 40, category: "Complementos", desc: "La de pata no puede faltar en tu carrito.", active: true },
        { id: "p5", name: "Agua de Sabor", price: 30, category: "Bebidas", desc: "Si te sientes fit y no fat, a llevar. (Jamaica/Horchata)", active: true },
        { id: "p6", name: "Refresco", price: 25, category: "Bebidas", desc: "No es pozole sin una rica Coca.", active: true }
    ];
}

// Load Active Products
export async function loadProducts() {
    try {
        const q = query(collection(db, "products"), where("active", "==", true));
        const querySnapshot = await getDocs(q);
        
        if(querySnapshot.empty) {
            seedProducts().catch(e => console.warn("No se pudo sembrar"));
            return getStaticProducts();
        }
        
        let products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        return products;
    } catch (e) {
        console.error("Error loading products, using fallback", e);
        return getStaticProducts();
    }
}

// Load All Products for Admin
export async function loadProductsAdmin() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        return products;
    } catch (e) {
        console.error("Error loading all products", e);
        return [];
    }
}

// Toggle Product Status (Admin)
export async function toggleProductStatus(productId, currentStatus) {
    try {
        await updateDoc(doc(db, "products", productId), {
            active: !currentStatus
        });
        return true;
    } catch (e) {
        console.error("Error updating product", e);
        return false;
    }
}

// Place New Order
export async function placeOrder(orderData) {
    try {
        const docRef = await addDoc(collection(db, "orders"), {
            ...orderData,
            status: "Recibido",
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error placing order", e);
        throw e;
    }
}

// Load User Orders
export async function loadUserOrders(uid) {
    try {
        const q = query(
            collection(db, "orders"), 
            where("userId", "==", uid)
        );
        const querySnapshot = await getDocs(q);
        let orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        // Ordenar localmente para evitar error de "Index Required" en Firestore
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return orders;
    } catch (e) {
        console.error("Error loading user orders", e);
        return [];
    }
}

// Load All Orders (Admin)
export async function loadAllOrders() {
    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        let orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
    } catch (e) {
        console.error("Error loading all orders", e);
        return [];
    }
}

// Update Order Status (Admin)
export async function updateOrderStatus(orderId, newStatus) {
    try {
        await updateDoc(doc(db, "orders", orderId), {
            status: newStatus
        });
        return true;
    } catch (e) {
        console.error("Error updating order status", e);
        return false;
    }
}

// Helper to seed initial products if DB is empty
async function seedProducts() {
    console.log("Seeding products...");
    const initialProducts = [
        { name: "Pozole Grande", price: 120, category: "Pozole", desc: "Porción de 1 litro con maciza o surtida.", active: true },
        { name: "Pozole Chico", price: 90, category: "Pozole", desc: "Porción de 500ml, ideal para el antojo.", active: true },
        { name: "Tostada de Tinga", price: 35, category: "Complementos", desc: "Crujiente y deliciosa. Este complemento no debe faltar.", active: true },
        { name: "Tostada de Pata", price: 40, category: "Complementos", desc: "La de pata no puede faltar en tu carrito.", active: true },
        { name: "Agua de Sabor", price: 30, category: "Bebidas", desc: "Si te sientes fit y no fat, a llevar. (Jamaica/Horchata)", active: true },
        { name: "Refresco", price: 25, category: "Bebidas", desc: "No es pozole sin una rica Coca.", active: true }
    ];
    
    for (const p of initialProducts) {
        await addDoc(collection(db, "products"), p);
    }
}
