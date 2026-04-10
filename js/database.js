import { db } from './firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    addDoc, 
    deleteDoc,
    query, 
    where, 
    orderBy,
    onSnapshot
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

// Listen Store Status
export function listenStoreStatus(callback) {
    const unsub = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
        if(docSnap.exists()) {
            callback(docSnap.data().isOpen);
        } else {
            // Default to open
            callback(true);
            setDoc(doc(db, "settings", "store"), { isOpen: true }).catch(()=>{});
        }
    });
    return unsub;
}

// Toggle Store Status (Admin)
export async function toggleStoreStatus(currentStatus) {
    try {
        await updateDoc(doc(db, "settings", "store"), {
            isOpen: !currentStatus
        });
        return true;
    } catch(e) {
        console.error("Error toggling store", e);
        // fallback setDoc in case setting doesn't exist
        try {
            await setDoc(doc(db, "settings", "store"), { isOpen: !currentStatus });
            return true;
        } catch(err) {
            return false;
        }
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
        
        let products = [];
        let seenNames = new Set();
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if(!seenNames.has(data.name)) {
                seenNames.add(data.name);
                products.push({ id: doc.id, ...data });
            }
        });
        return products;
    } catch (e) {
        console.error("Error loading products", e);
        return [];
    }
}

// Load All Products for Admin
export async function loadProductsAdmin() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        
        let products = [];
        let seenNames = new Set();
        let duplicatesToDelete = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if(seenNames.has(data.name)) {
                duplicatesToDelete.push(doc.id);
            } else {
                seenNames.add(data.name);
                products.push({ id: doc.id, ...data });
            }
        });
        
        // Auto-purge redundant duplication in Firebase from bugs
        if (duplicatesToDelete.length > 0) {
            console.warn("Purging duplicated products from Firebase:", duplicatesToDelete);
            duplicatesToDelete.forEach(id => deleteDoc(doc(db, "products", id)).catch(()=>{}));
        }
        
        return products;
    } catch (e) {
        console.error("Error loading all products", e);
        return getStaticProducts();
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

// Delete Order (Admin)
export async function deleteOrder(orderId) {
    try {
        await deleteDoc(doc(db, "orders", orderId));
        return true;
    } catch (e) {
        console.error("Error deleting order", e);
        return false;
    }
}

// Seeds removed to prevent production DB pollution
