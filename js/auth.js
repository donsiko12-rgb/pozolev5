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

    // Zip Code Smart API Integration
    const zipInput = document.getElementById('reg-zip');
    if (zipInput) {
        zipInput.addEventListener('input', async (e) => {
            const zipCode = e.target.value.trim();
            let neighborhoodInput = document.getElementById('reg-neighborhood');

            if (zipCode.length === 5) {
                // Keep it as a select object
                if (neighborhoodInput.tagName.toLowerCase() === 'input') {
                    const newSelect = document.createElement('select');
                    newSelect.id = 'reg-neighborhood';
                    newSelect.required = true;
                    newSelect.style.cssText = neighborhoodInput.style.cssText;
                    neighborhoodInput.parentNode.replaceChild(newSelect, neighborhoodInput);
                    neighborhoodInput = newSelect;
                }

                neighborhoodInput.innerHTML = '<option value="">Buscando colonias...</option>';
                neighborhoodInput.disabled = true;
                
                try {
                    const response = await fetch(`https://api.zippopotam.us/mx/${zipCode}`);
                    if (!response.ok) throw new Error("No encontrado");
                    const data = await response.json();
                    
                    neighborhoodInput.innerHTML = '<option value="">Selecciona tu colonia</option>';
                    data.places.forEach(place => {
                        const option = document.createElement('option');
                        option.value = place["place name"];
                        option.textContent = place["place name"];
                        neighborhoodInput.appendChild(option);
                    });
                    neighborhoodInput.disabled = false;
                } catch (error) {
                    // Fallback to purely free text box if Internet/API fails or ZIP not found
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = 'reg-neighborhood';
                    input.required = true;
                    input.placeholder = 'No se encontró (escribe abajo):';
                    input.style.cssText = "width:100%; padding: 14px 16px; border: 1.5px solid var(--color-border); border-radius: var(--radius-sm); font-family: 'Inter', sans-serif; font-size: 1rem; background-color: #FAFAFA;";
                    neighborhoodInput.parentNode.replaceChild(input, neighborhoodInput);
                }
            } else if (zipCode.length < 5) {
                // If they delete digits, revert to a disabled safe-guard
                if (neighborhoodInput.tagName.toLowerCase() === 'select') {
                    neighborhoodInput.innerHTML = '<option value="">Primero ingresa C.P. a 5 dígitos</option>';
                    neighborhoodInput.disabled = true;
                }
            }
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
            
            const street = document.getElementById('reg-street').value;
            const number = document.getElementById('reg-number').value;
            const zip = document.getElementById('reg-zip').value;
            const neighborhood = document.getElementById('reg-neighborhood').value;
            const address = `${street} #${number}, Col. ${neighborhood}, C.P. ${zip}`;
            
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
                    street,
                    number,
                    neighborhood,
                    zip,
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
