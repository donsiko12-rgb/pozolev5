import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { showToast } from './ui.js';
import { App } from './app.js';

export function init() {
    // UI Toggles
    const linkRegister = document.getElementById('link-register');
    const linkLogin = document.getElementById('link-login');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    if(linkRegister) {
        linkRegister.addEventListener('click', (e) => {
            e.preventDefault();
            formLogin.classList.remove('active');
            formRegister.classList.add('active');
        });
    }

    if(linkLogin) {
        linkLogin.addEventListener('click', (e) => {
            e.preventDefault();
            formRegister.classList.remove('active');
            formLogin.classList.add('active');
        });
    }

    // Login Form Submit
    if(formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            
            try {
                errorEl.textContent = "Verificando...";
                await signInWithEmailAndPassword(auth, email, password);
                errorEl.textContent = "";
                formLogin.reset();
            } catch (error) {
                console.error(error);
                errorEl.textContent = "Error al iniciar sesión. Revisa tus datos.";
            }
        });
    }

    // Register Form Submit
    if(formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const name = document.getElementById('reg-name').value;
            const address = document.getElementById('reg-address').value;
            const phone = document.getElementById('reg-phone').value;
            const errorEl = document.getElementById('reg-error');
            
            try {
                errorEl.textContent = "Creando cuenta...";
                
                // Create user in Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // Force user role to 'client' and save profile to Firestore
                await setDoc(doc(db, "users", user.uid), {
                    name,
                    address,
                    phone,
                    email,
                    role: "client",
                    createdAt: new Date().toISOString()
                });
                
                errorEl.textContent = "";
                formRegister.reset();
                showToast("Cuenta creada exitosamente");
                
            } catch (error) {
                console.error(error);
                if(error.code === 'auth/email-already-in-use') {
                    errorEl.textContent = "Este correo ya está registrado.";
                } else {
                    errorEl.textContent = "Error al crear la cuenta. Intenta de nuevo.";
                }
            }
        });
    }

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showToast("Sesión cerrada");
            } catch (error) {
                console.error("Error al salir", error);
            }
        });
    }
}
