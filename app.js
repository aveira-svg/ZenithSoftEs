// Configuración de Firebase - YA NO ES NECESARIO INICIALIZAR AQUÍ
// Las variables están disponibles desde index.html a través de window.firebase
const auth = window.firebase.auth;
const db = window.firebase.db;
const firestore = window.firebase.firestore;
const authFunctions = window.firebase.authFunctions;

// Estado de la aplicación
let currentUser = null;
let userPermissions = {};
let events = [];
let articles = [];
let places = [];
let users = [];

// Referencias a elementos DOM (mantener igual)
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');
const navButtons = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');
const eventsContainer = document.getElementById('events-container');
const configBtn = document.getElementById('config-btn');
const newEventBtn = document.getElementById('new-event-btn');
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');
const userModal = document.getElementById('user-modal');
const userForm = document.getElementById('user-form');
const articleModal = document.getElementById('article-modal');
const articleForm = document.getElementById('article-form');
const placeModal = document.getElementById('place-modal');
const placeForm = document.getElementById('place-form');
const newUserBtn = document.getElementById('new-user-btn');
const newArticleBtn = document.getElementById('new-article-btn');
const newPlaceBtn = document.getElementById('new-place-btn');
const usersList = document.getElementById('users-list');
const articlesList = document.getElementById('articles-list');
const placesList = document.getElementById('places-list');
const filterPersonal = document.getElementById('filter-personal');
const profileEmail = document.getElementById('profile-email');
const profileRole = document.getElementById('profile-role');
const profilePermissions = document.getElementById('profile-permissions');

// Inicializar la aplicación
function init() {
    setupEventListeners();
    checkAuthState();
    loadInitialData();
}

// Configurar event listeners
function setupEventListeners() {
    // Autenticación
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout); // Cambiado de submit a click
    
    // Navegación
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchSection(btn.dataset.section));
    });
    
    // Modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Eventos
    newEventBtn.addEventListener('click', () => openEventModal());
    eventForm.addEventListener('submit', handleEventSubmit);
    
    // Configuración (admin)
    configBtn.addEventListener('click', () => {
        if (currentUser && userPermissions.isAdmin) {
            loadUsers();
            loadArticles();
            loadPlaces();
        }
    });
    
    newUserBtn.addEventListener('click', () => openUserModal());
    userForm.addEventListener('submit', handleUserSubmit);
    
    newArticleBtn.addEventListener('click', () => openArticleModal());
    articleForm.addEventListener('submit', handleArticleSubmit);
    
    newPlaceBtn.addEventListener('click', () => openPlaceModal());
    placeForm.addEventListener('submit', handlePlaceSubmit);
    
    // Filtro
    filterPersonal.addEventListener('change', filterEvents);
    
    // Subeventos
    document.getElementById('add-subevent').addEventListener('click', () => addSubEventInput());
}

// Verificar estado de autenticación
function checkAuthState() {
    authFunctions.onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loginScreen.classList.remove('active');
            app.classList.add('active');
            loadUserData(user.uid);
        } else {
            currentUser = null;
            app.classList.remove('active');
            loginScreen.classList.add('active');
        }
    });
}

// Manejar inicio de sesión
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        await authFunctions.signInWithEmailAndPassword(auth, email, password);
        errorDiv.textContent = '';
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

// Manejar cierre de sesión
function handleLogout() {
    authFunctions.signOut(auth);
}

// Cargar datos del usuario
async function loadUserData(uid) {
    try {
        const userDoc = await firestore.getDoc(firestore.doc(db, 'usuarios', uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            userNameSpan.textContent = userData.email;
            
            // Guardar permisos
            userPermissions = {
                isAdmin: userData.rol === 'admin',
                crearEventosPersonales: userData.permisos?.crearEventosPersonales || false,
                administrarFOUNNE: userData.permisos?.administrarFOUNNE || false,
                soloLectura: userData.permisos?.soloLectura || false
            };
            
            // Actualizar UI según permisos
            updateUIForPermissions();
            
            // Cargar perfil
            loadProfile(userData);
            
            // Cargar eventos
            loadEvents();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// ... (las funciones updateUIForPermissions, loadProfile, formatPermissionName, switchSection permanecen igual)

// Cargar datos iniciales
function loadInitialData() {
    loadArticles();
    loadPlaces();
}

// Cargar artículos (ACTUALIZADO para Firebase v9)
async function loadArticles() {
    try {
        const querySnapshot = await firestore.getDocs(firestore.collection(db, 'articulos'));
        articles = [];
        querySnapshot.forEach(doc => {
            articles.push({ id: doc.id, ...doc.data() });
        });
        
        // Si estamos en la sección de configuración, renderizar
        if (document.getElementById('configuracion-section').classList.contains('active')) {
            renderArticles();
        }
    } catch (error) {
        console.error('Error loading articles:', error);
    }
}

// Cargar lugares (ACTUALIZADO para Firebase v9)
async function loadPlaces() {
    try {
        const querySnapshot = await firestore.getDocs(firestore.collection(db, 'lugares'));
        places = [];
        querySnapshot.forEach(doc => {
            places.push({ id: doc.id, ...doc.data() });
        });
        
        // Si estamos en la sección de configuración, renderizar
        if (document.getElementById('configuracion-section').classList.contains('active')) {
            renderPlaces();
        }
    } catch (error) {
        console.error('Error loading places:', error);
    }
}

// Cargar eventos (ACTUALIZADO para Firebase v9)
async function loadEvents() {
    try {
        let q = firestore.query(firestore.collection(db, 'eventos'), firestore.orderBy('fechaInicio', 'asc'));
        
        // Si no es admin y tiene restricciones, filtrar eventos
        if (!userPermissions.isAdmin) {
            if (userPermissions.administrarFOUNNE && userPermissions.crearEventosPersonales) {
                // Puede ver todos los eventos
            } else if (userPermissions.administrarFOUNNE) {
                q = firestore.query(q, firestore.where('tipo', '==', 'FOUNNE'));
            } else if (userPermissions.crearEventosPersonales) {
                q = firestore.query(q, 
                    firestore.where('tipo', '==', 'Personal'),
                    firestore.where('usuarioId', '==', currentUser.uid)
                );
            } else {
                // Solo lectura posiblemente de eventos FOUNNE
                q = firestore.query(q, firestore.where('tipo', '==', 'FOUNNE'));
            }
        }
        
        const querySnapshot = await firestore.getDocs(q);
        events = [];
        querySnapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        renderEvents();
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// ... (las funciones filterEvents, renderEvents, formatDateTime, getPlaceName permanecen igual)

// Alternar subevento (ACTUALIZADO para Firebase v9)
async function toggleSubEvent(eventId, subEventTitle, completed) {
    try {
        const eventRef = firestore.doc(db, 'eventos', eventId);
        const eventDoc = await firestore.getDoc(eventRef);
        
        if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            const updatedSubEvents = eventData.subEventos.map(sub => {
                if (sub.titulo === subEventTitle) {
                    return { ...sub, completado: completed };
                }
                return sub;
            });
            
            await firestore.updateDoc(eventRef, {
                subEventos: updatedSubEvents,
                historial: firestore.arrayUnion({
                    accion: `Subevento "${subEventTitle}" ${completed ? 'completado' : 'pendiente'}`,
                    fecha: new Date().toISOString()
                })
            });
            
            // Recargar eventos
            loadEvents();
        }
    } catch (error) {
        console.error('Error updating subevent:', error);
    }
}

// Manejar acción de evento (encender/prestar) (ACTUALIZADO para Firebase v9)
async function manageEventAction(eventId, action) {
    try {
        const eventRef = firestore.doc(db, 'eventos', eventId);
        const eventDoc = await firestore.getDoc(eventRef);
        
        if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            
            // Actualizar historial
            await firestore.updateDoc(eventRef, {
                historial: firestore.arrayUnion({
                    accion: action === 'encender' ? 'Artículos encendidos' : 'Artículos prestados',
                    fecha: new Date().toISOString(),
                    usuario: currentUser.uid
                })
            });
            
            // Si es "encender" o "prestar", actualizar estado de artículos
            if (action === 'encender' || action === 'prestar') {
                if (eventData.articulos && eventData.articulos.length > 0) {
                    for (const artId of eventData.articulos) {
                        const article = articles.find(a => a.id === artId);
                        if (article && (
                            (action === 'encender' && article.tipo === 'electrico') ||
                            (action === 'prestar' && article.tipo === 'fisico')
                        )) {
                            await firestore.updateDoc(firestore.doc(db, 'articulos', artId), {
                                estado: 'en uso'
                            });
                        }
                    }
                }
            }
            
            // Recargar datos
            loadArticles();
            loadEvents();
        }
    } catch (error) {
        console.error('Error managing event action:', error);
    }
}

// ... (las funciones openEventModal, formatDateTimeForInput, addSubEventInput, removeSubEvent permanecen igual)

// Manejar envío de formulario de evento (ACTUALIZADO para Firebase v9)
async function handleEventSubmit(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('event-id').value;
    const tipo = document.getElementById('event-type').value;
    const titulo = document.getElementById('event-title').value;
    const lugarId = document.getElementById('event-place').value;
    const fechaInicio = document.getElementById('event-start').value;
    const fechaFin = document.getElementById('event-end').value;
    
    // Obtener artículos seleccionados
    const articulos = [];
    document.querySelectorAll('#articles-checkboxes input:checked').forEach(cb => {
        articulos.push(cb.value);
    });
    
    // Obtener subeventos
    const subEventos = [];
    document.querySelectorAll('.subevent-input').forEach(input => {
        if (input.value.trim() !== '') {
            subEventos.push({
                titulo: input.value.trim(),
                completado: false
            });
        }
    });
    
    const eventData = {
        tipo,
        titulo,
        lugarId,
        fechaInicio: new Date(fechaInicio).toISOString(),
        fechaFin: new Date(fechaFin).toISOString(),
        articulos,
        subEventos,
        estado: 'pendiente',
        historial: [{
            accion: eventId ? 'Evento actualizado' : 'Evento creado',
            fecha: new Date().toISOString(),
            usuario: currentUser.uid
        }]
    };
    
    // Si es nuevo evento, añadir usuarioId
    if (!eventId) {
        eventData.usuarioId = currentUser.uid;
    }
    
    try {
        if (eventId) {
            // Actualizar evento existente
            await firestore.updateDoc(firestore.doc(db, 'eventos', eventId), eventData);
        } else {
            // Crear nuevo evento
            await firestore.addDoc(firestore.collection(db, 'eventos'), eventData);
        }
        
        // Cerrar modal y recargar eventos
        document.getElementById('event-modal').style.display = 'none';
        loadEvents();
    } catch (error) {
        console.error('Error saving event:', error);
        alert('Error al guardar el evento: ' + error.message);
    }
}

// Eliminar evento (ACTUALIZADO para Firebase v9)
async function deleteEvent(eventId) {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
        try {
            await firestore.deleteDoc(firestore.doc(db, 'eventos', eventId));
            loadEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Error al eliminar el evento: ' + error.message);
        }
    }
}

// Cargar usuarios (solo admin) (ACTUALIZADO para Firebase v9)
async function loadUsers() {
    if (!userPermissions.isAdmin) return;
    
    try {
        const querySnapshot = await firestore.getDocs(firestore.collection(db, 'usuarios'));
        users = [];
        querySnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// ... (las funciones renderUsers, formatPermissions, openUserModal permanecen igual)

// Manejar envío de formulario de usuario (ACTUALIZADO para Firebase v9)
async function handleUserSubmit(e) {
    e.preventDefault();
    
    if (!userPermissions.isAdmin) {
        alert('No tienes permisos para realizar esta acción');
        return;
    }
    
    const userId = document.getElementById('user-id').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const rol = document.getElementById('user-role').value;
    
    const permisos = {
        crearEventosPersonales: document.getElementById('permiso-crear').checked,
        administrarFOUNNE: document.getElementById('permiso-founne').checked,
        soloLectura: document.getElementById('permiso-lectura').checked
    };
    
    try {
        if (userId) {
            // Actualizar usuario existente
            const userData = { rol, permisos };
            
            // Si se proporcionó una nueva contraseña, actualizarla
            if (password) {
                // Aquí necesitarías una Cloud Function para actualizar la contraseña
                alert('La actualización de contraseñas requiere una Cloud Function. Contacta al administrador.');
            }
            
            await firestore.updateDoc(firestore.doc(db, 'usuarios', userId), userData);
        } else {
            // Crear nuevo usuario
            // Primero crear en Authentication
            const userCredential = await authFunctions.createUserWithEmailAndPassword(auth, email, password);
            const newUserId = userCredential.user.uid;
            
            // Luego guardar en Firestore
            await firestore.setDoc(firestore.doc(db, 'usuarios', newUserId), {
                email,
                rol,
                permisos
            });
        }
        
        // Cerrar modal y recargar usuarios
        document.getElementById('user-modal').style.display = 'none';
        loadUsers();
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Error al guardar el usuario: ' + error.message);
    }
}

// Eliminar usuario (ACTUALIZADO para Firebase v9)
async function deleteUser(userId) {
    if (!userPermissions.isAdmin) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        try {
            // Eliminar de Firestore
            await firestore.deleteDoc(firestore.doc(db, 'usuarios', userId));
            
            // Eliminar de Authentication (requeriría una Cloud Function)
            alert('Usuario eliminado de la base de datos. Contacta al administrador para eliminar completamente de Authentication.');
            
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error al eliminar el usuario: ' + error.message);
        }
    }
}

// ... (las funciones renderArticles, openArticleModal, handleArticleSubmit, editArticle, deleteArticle permanecen igual pero actualizadas con sintaxis v9)

// Manejar envío de formulario de artículo (ACTUALIZADO para Firebase v9)
async function handleArticleSubmit(e) {
    e.preventDefault();
    
    if (!userPermissions.isAdmin) {
        alert('No tienes permisos para realizar esta acción');
        return;
    }
    
    const articleId = document.getElementById('article-id').value;
    const nombre = document.getElementById('article-name').value;
    const tipo = document.getElementById('article-type').value;
    
    const articleData = { nombre, tipo, estado: 'disponible' };
    
    try {
        if (articleId) {
            // Actualizar artículo existente
            await firestore.updateDoc(firestore.doc(db, 'articulos', articleId), articleData);
        } else {
            // Crear nuevo artículo
            await firestore.addDoc(firestore.collection(db, 'articulos'), articleData);
        }
        
        // Cerrar modal y recargar artículos
        document.getElementById('article-modal').style.display = 'none';
        loadArticles();
    } catch (error) {
        console.error('Error saving article:', error);
        alert('Error al guardar el artículo: ' + error.message);
    }
}

// ... (las funciones renderPlaces, openPlaceModal, handlePlaceSubmit, editPlace, deletePlace permanecen igual pero actualizadas con sintaxis v9)

// Manejar envío de formulario de lugar (ACTUALIZADO para Firebase v9)
async function handlePlaceSubmit(e) {
    e.preventDefault();
    
    if (!userPermissions.isAdmin) {
        alert('No tienes permisos para realizar esta acción');
        return;
    }
    
    const placeId = document.getElementById('place-id').value;
    const nombre = document.getElementById('place-name').value;
    const sector = document.getElementById('place-sector').value;
    
    const placeData = { nombre, sector };
    
    try {
        if (placeId) {
            // Actualizar lugar existente
            await firestore.updateDoc(firestore.doc(db, 'lugares', placeId), placeData);
        } else {
            // Crear nuevo lugar
            await firestore.addDoc(firestore.collection(db, 'lugares'), placeData);
        }
        
        // Cerrar modal y recargar lugares
        document.getElementById('place-modal').style.display = 'none';
        loadPlaces();
    } catch (error) {
        console.error('Error saving place:', error);
        alert('Error al guardar el lugar: ' + error.message);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// Hacer funciones globales para los event listeners en HTML
window.toggleSubEvent = toggleSubEvent;
window.manageEventAction = manageEventAction;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
window.addSubEventInput = addSubEventInput;
window.removeSubEvent = removeSubEvent;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.editArticle = editArticle;
window.deleteArticle = deleteArticle;
window.editPlace = editPlace;
window.deletePlace = deletePlace;
