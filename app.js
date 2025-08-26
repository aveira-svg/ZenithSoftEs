// Configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Estado de la aplicación
let currentUser = null;
let userPermissions = {};
let events = [];
let articles = [];
let places = [];
let users = [];

// Referencias a elementos DOM
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
    logoutBtn.addEventListener('submit', handleLogout);
    
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
}

// Verificar estado de autenticación
function checkAuthState() {
    auth.onAuthStateChanged(user => {
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
        await auth.signInWithEmailAndPassword(email, password);
        errorDiv.textContent = '';
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

// Manejar cierre de sesión
function handleLogout() {
    auth.signOut();
}

// Cargar datos del usuario
async function loadUserData(uid) {
    try {
        const userDoc = await db.collection('usuarios').doc(uid).get();
        if (userDoc.exists) {
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

// Actualizar UI según permisos
function updateUIForPermissions() {
    // Mostrar/ocultar botones según permisos
    if (userPermissions.isAdmin) {
        configBtn.style.display = 'block';
    } else {
        configBtn.style.display = 'none';
    }
    
    if (userPermissions.crearEventosPersonales || userPermissions.administrarFOUNNE) {
        newEventBtn.style.display = 'block';
    } else {
        newEventBtn.style.display = 'none';
    }
}

// Cargar perfil de usuario
function loadProfile(userData) {
    profileEmail.textContent = userData.email;
    profileRole.textContent = userData.rol === 'admin' ? 'Administrador' : 'Usuario';
    
    // Limpiar permisos anteriores
    profilePermissions.innerHTML = '';
    
    // Agregar permisos
    if (userData.permisos) {
        for (const [key, value] of Object.entries(userData.permisos)) {
            if (value) {
                const li = document.createElement('li');
                li.textContent = formatPermissionName(key);
                profilePermissions.appendChild(li);
            }
        }
    }
}

// Formatear nombre de permiso
function formatPermissionName(permission) {
    const names = {
        crearEventosPersonales: 'Crear eventos personales',
        administrarFOUNNE: 'Administrar FOUNNE',
        soloLectura: 'Solo lectura'
    };
    return names[permission] || permission;
}

// Cambiar sección
function switchSection(sectionId) {
    // Actualizar botones de navegación
    navButtons.forEach(btn => {
        if (btn.dataset.section === sectionId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Mostrar sección correspondiente
    contentSections.forEach(section => {
        if (section.id === `${sectionId}-section`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
}

// Cargar datos iniciales
function loadInitialData() {
    loadArticles();
    loadPlaces();
}

// Cargar artículos
async function loadArticles() {
    try {
        const snapshot = await db.collection('articulos').get();
        articles = [];
        snapshot.forEach(doc => {
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

// Cargar lugares
async function loadPlaces() {
    try {
        const snapshot = await db.collection('lugares').get();
        places = [];
        snapshot.forEach(doc => {
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

// Cargar eventos
async function loadEvents() {
    try {
        let query = db.collection('eventos').orderBy('fechaInicio', 'asc');
        
        // Si no es admin y tiene restricciones, filtrar eventos
        if (!userPermissions.isAdmin) {
            if (userPermissions.administrarFOUNNE && userPermissions.crearEventosPersonales) {
                // Puede ver todos los eventos
            } else if (userPermissions.administrarFOUNNE) {
                query = query.where('tipo', '==', 'FOUNNE');
            } else if (userPermissions.crearEventosPersonales) {
                query = query.where('tipo', '==', 'Personal')
                            .where('usuarioId', '==', currentUser.uid);
            } else {
                // Solo lectura posiblemente de eventos FOUNNE
                query = query.where('tipo', '==', 'FOUNNE');
            }
        }
        
        const snapshot = await query.get();
        events = [];
        snapshot.forEach(doc => {
            events.push({ id: doc.id, ...doc.data() });
        });
        
        renderEvents();
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Filtrar eventos
function filterEvents() {
    renderEvents();
}

// Renderizar eventos
function renderEvents() {
    eventsContainer.innerHTML = '';
    
    const showOnlyPersonal = filterPersonal.checked;
    
    events.forEach(event => {
        // Filtrar si es necesario
        if (showOnlyPersonal && event.tipo === 'FOUNNE') {
            return;
        }
        
        if (showOnlyPersonal && event.tipo === 'Personal' && event.usuarioId !== currentUser.uid) {
            return;
        }
        
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        
        // Determinar clase de estado
        const now = new Date();
        const startTime = new Date(event.fechaInicio);
        const endTime = new Date(event.fechaFin);
        
        if (now > endTime) {
            eventCard.classList.add('finalizado');
        } else if (now >= startTime && now <= endTime) {
            // Verificar si todos los subeventos están completados
            const allCompleted = event.subEventos ? 
                event.subEventos.every(sub => sub.completado) : true;
            
            if (allCompleted) {
                eventCard.classList.add('activo');
            } else {
                eventCard.classList.add('alerta');
            }
        } else if ((startTime - now) <= 30 * 60 * 1000) {
            eventCard.classList.add('alerta');
        }
        
        // Construir HTML del evento
        eventCard.innerHTML = `
            <div class="event-header">
                <div>
                    <h3 class="event-title">${event.titulo}</h3>
                    <div class="event-time">
                        ${formatDateTime(event.fechaInicio)} - ${formatDateTime(event.fechaFin)}
                    </div>
                </div>
                <span class="event-type">${event.tipo}</span>
            </div>
            
            <div class="event-details">
                <div class="event-place">
                    Lugar: ${getPlaceName(event.lugarId)}
                </div>
                
                ${event.articulos && event.articulos.length > 0 ? `
                <div class="event-articles">
                    <strong>Artículos:</strong>
                    <div class="article-list">
                        ${event.articulos.map(artId => {
                            const article = articles.find(a => a.id === artId);
                            if (!article) return '';
                            return `
                                <div class="article-item">
                                    <span class="article-status ${article.estado}"></span>
                                    ${article.nombre}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${event.subEventos && event.subEventos.length > 0 ? `
                <div class="subevents-list">
                    <strong>Sub-eventos:</strong>
                    ${event.subEventos.map(sub => `
                        <div class="subevent-item">
                            <input type="checkbox" ${sub.completado ? 'checked' : ''} 
                                onchange="toggleSubEvent('${event.id}', '${sub.titulo}', this.checked)"
                                ${userPermissions.soloLectura ? 'disabled' : ''}>
                            <span class="${sub.completado ? 'subevent-completed' : ''}">${sub.titulo}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
            
            <div class="event-actions">
                ${!userPermissions.soloLectura ? `
                    ${event.tipo === 'FOUNNE' && userPermissions.administrarFOUNNE ? `
                        <button class="btn-neon-small" onclick="manageEventAction('${event.id}', 'encender')">Encender</button>
                        <button class="btn-neon-small" onclick="manageEventAction('${event.id}', 'prestar')">Prestar</button>
                    ` : ''}
                    
                    ${event.tipo === 'Personal' && userPermissions.crearEventosPersonales ? `
                        <button class="btn-neon-small" onclick="editEvent('${event.id}')">Editar</button>
                    ` : ''}
                    
                    ${(userPermissions.isAdmin || 
                      (event.tipo === 'FOUNNE' && userPermissions.administrarFOUNNE) ||
                      (event.tipo === 'Personal' && event.usuarioId === currentUser.uid)) ? `
                        <button class="btn-neon-small" onclick="deleteEvent('${event.id}')">Eliminar</button>
                    ` : ''}
                ` : ''}
            </div>
        `;
        
        eventsContainer.appendChild(eventCard);
    });
}

// Formatear fecha y hora
function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Obtener nombre del lugar
function getPlaceName(placeId) {
    const place = places.find(p => p.id === placeId);
    return place ? place.nombre : 'Desconocido';
}

// Alternar subevento
async function toggleSubEvent(eventId, subEventTitle, completed) {
    try {
        const eventRef = db.collection('eventos').doc(eventId);
        const eventDoc = await eventRef.get();
        
        if (eventDoc.exists) {
            const eventData = eventDoc.data();
            const updatedSubEvents = eventData.subEventos.map(sub => {
                if (sub.titulo === subEventTitle) {
                    return { ...sub, completado: completed };
                }
                return sub;
            });
            
            await eventRef.update({
                subEventos: updatedSubEvents,
                historial: firebase.firestore.FieldValue.arrayUnion({
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

// Manejar acción de evento (encender/prestar)
async function manageEventAction(eventId, action) {
    try {
        const eventRef = db.collection('eventos').doc(eventId);
        const eventDoc = await eventRef.get();
        
        if (eventDoc.exists) {
            const eventData = eventDoc.data();
            
            // Actualizar historial
            await eventRef.update({
                historial: firebase.firestore.FieldValue.arrayUnion({
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
                            await db.collection('articulos').doc(artId).update({
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

// Abrir modal de evento
function openEventModal(eventId = null) {
    const modal = document.getElementById('event-modal');
    const title = document.getElementById('modal-event-title');
    const form = document.getElementById('event-form');
    const eventIdField = document.getElementById('event-id');
    
    if (eventId) {
        // Modo edición
        title.textContent = 'Editar Evento';
        eventIdField.value = eventId;
        
        // Cargar datos del evento
        const event = events.find(e => e.id === eventId);
        if (event) {
            document.getElementById('event-type').value = event.tipo;
            document.getElementById('event-title').value = event.titulo;
            document.getElementById('event-place').value = event.lugarId;
            document.getElementById('event-start').value = formatDateTimeForInput(event.fechaInicio);
            document.getElementById('event-end').value = formatDateTimeForInput(event.fechaFin);
            
            // Seleccionar artículos
            if (event.articulos) {
                const checkboxes = document.querySelectorAll('#articles-checkboxes input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = event.articulos.includes(cb.value);
                });
            }
            
            // Cargar subeventos
            const subeventsContainer = document.getElementById('subevents-container');
            subeventsContainer.innerHTML = '';
            
            if (event.subEventos && event.subEventos.length > 0) {
                event.subEventos.forEach(sub => {
                    addSubEventInput(sub.titulo);
                });
            } else {
                addSubEventInput();
            }
        }
    } else {
        // Modo nuevo
        title.textContent = 'Nuevo Evento';
        eventIdField.value = '';
        form.reset();
        
        // Limpiar y añadir un subevento vacío
        const subeventsContainer = document.getElementById('subevents-container');
        subeventsContainer.innerHTML = '';
        addSubEventInput();
    }
    
    // Cargar lugares en el select
    const placeSelect = document.getElementById('event-place');
    placeSelect.innerHTML = '';
    places.forEach(place => {
        const option = document.createElement('option');
        option.value = place.id;
        option.textContent = place.nombre;
        placeSelect.appendChild(option);
    });
    
    // Cargar artículos en checkboxes
    const articlesContainer = document.getElementById('articles-checkboxes');
    articlesContainer.innerHTML = '';
    articles.forEach(article => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${article.id}">
            ${article.nombre} (${article.tipo})
        `;
        articlesContainer.appendChild(label);
    });
    
    modal.style.display = 'block';
}

// Formatear fecha y hora para input datetime-local
function formatDateTimeForInput(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toISOString().slice(0, 16);
}

// Añadir input de subevento
function addSubEventInput(value = '') {
    const container = document.getElementById('subevents-container');
    const div = document.createElement('div');
    div.className = 'subevent-item';
    div.innerHTML = `
        <input type="text" placeholder="Título del subevento" class="subevent-input" value="${value}">
        <button type="button" class="remove-subevent" onclick="removeSubEvent(this)">×</button>
    `;
    container.appendChild(div);
}

// Eliminar input de subevento
function removeSubEvent(button) {
    const container = document.getElementById('subevents-container');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

// Manejar envío de formulario de evento
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
            await db.collection('eventos').doc(eventId).update(eventData);
        } else {
            // Crear nuevo evento
            await db.collection('eventos').add(eventData);
        }
        
        // Cerrar modal y recargar eventos
        document.getElementById('event-modal').style.display = 'none';
        loadEvents();
    } catch (error) {
        console.error('Error saving event:', error);
        alert('Error al guardar el evento: ' + error.message);
    }
}

// Editar evento
function editEvent(eventId) {
    openEventModal(eventId);
}

// Eliminar evento
async function deleteEvent(eventId) {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
        try {
            await db.collection('eventos').doc(eventId).delete();
            loadEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Error al eliminar el evento: ' + error.message);
        }
    }
}

// Cargar usuarios (solo admin)
async function loadUsers() {
    if (!userPermissions.isAdmin) return;
    
    try {
        const snapshot = await db.collection('usuarios').get();
        users = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Renderizar usuarios
function renderUsers() {
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        userItem.innerHTML = `
            <div class="item-details">
                <strong>${user.email}</strong> (${user.rol})
                <div>Permisos: ${formatPermissions(user.permisos)}</div>
            </div>
            <div class="item-actions">
                <button class="btn-neon-small" onclick="editUser('${user.id}')">Editar</button>
                <button class="btn-neon-small" onclick="deleteUser('${user.id}')">Eliminar</button>
            </div>
        `;
        
        usersList.appendChild(userItem);
    });
}

// Formatear permisos para mostrar
function formatPermissions(permisos) {
    if (!permisos) return 'Ninguno';
    
    const parts = [];
    if (permisos.crearEventosPersonales) parts.push('Crear eventos');
    if (permisos.administrarFOUNNE) parts.push('Administrar FOUNNE');
    if (permisos.soloLectura) parts.push('Solo lectura');
    
    return parts.length > 0 ? parts.join(', ') : 'Ninguno';
}

// Abrir modal de usuario
function openUserModal(userId = null) {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    const userIdField = document.getElementById('user-id');
    
    if (userId) {
        // Modo edición
        userIdField.value = userId;
        
        // Cargar datos del usuario
        const user = users.find(u => u.id === userId);
        if (user) {
            document.getElementById('user-email').value = user.email;
            document.getElementById('user-email').disabled = true;
            document.getElementById('user-password').required = false;
            document.getElementById('user-role').value = user.rol;
            
            // Establecer permisos
            if (user.permisos) {
                document.getElementById('permiso-crear').checked = user.permisos.crearEventosPersonales || false;
                document.getElementById('permiso-founne').checked = user.permisos.administrarFOUNNE || false;
                document.getElementById('permiso-lectura').checked = user.permisos.soloLectura || false;
            }
        }
    } else {
        // Modo nuevo
        userIdField.value = '';
        form.reset();
        document.getElementById('user-email').disabled = false;
        document.getElementById('user-password').required = true;
    }
    
    modal.style.display = 'block';
}

// Manejar envío de formulario de usuario
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
                // ya que Firebase Admin SDK no está disponible en el cliente
                alert('La actualización de contraseñas requiere una Cloud Function. Contacta al administrador.');
            }
            
            await db.collection('usuarios').doc(userId).update(userData);
        } else {
            // Crear nuevo usuario
            // Primero crear en Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const newUserId = userCredential.user.uid;
            
            // Luego guardar en Firestore
            await db.collection('usuarios').doc(newUserId).set({
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

// Editar usuario
function editUser(userId) {
    openUserModal(userId);
}

// Eliminar usuario
async function deleteUser(userId) {
    if (!userPermissions.isAdmin) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        try {
            // Eliminar de Firestore
            await db.collection('usuarios').doc(userId).delete();
            
            // Eliminar de Authentication (requeriría una Cloud Function)
            alert('Usuario eliminado de la base de datos. Contacta al administrador para eliminar completamente de Authentication.');
            
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error al eliminar el usuario: ' + error.message);
        }
    }
}

// Renderizar artículos
function renderArticles() {
    articlesList.innerHTML = '';
    
    articles.forEach(article => {
        const articleItem = document.createElement('div');
        articleItem.className = 'item-item';
        
        articleItem.innerHTML = `
            <div class="item-details">
                <strong>${article.nombre}</strong> (${article.tipo})
                <div>Estado: ${article.estado}</div>
            </div>
            <div class="item-actions">
                <button class="btn-neon-small" onclick="editArticle('${article.id}')">Editar</button>
                <button class="btn-neon-small" onclick="deleteArticle('${article.id}')">Eliminar</button>
            </div>
        `;
        
        articlesList.appendChild(articleItem);
    });
}

// Abrir modal de artículo
function openArticleModal(articleId = null) {
    const modal = document.getElementById('article-modal');
    const title = document.getElementById('modal-article-title');
    const form = document.getElementById('article-form');
    const articleIdField = document.getElementById('article-id');
    
    if (articleId) {
        // Modo edición
        title.textContent = 'Editar Artículo';
        articleIdField.value = articleId;
        
        // Cargar datos del artículo
        const article = articles.find(a => a.id === articleId);
        if (article) {
            document.getElementById('article-name').value = article.nombre;
            document.getElementById('article-type').value = article.tipo;
        }
    } else {
        // Modo nuevo
        title.textContent = 'Nuevo Artículo';
        articleIdField.value = '';
        form.reset();
    }
    
    modal.style.display = 'block';
}

// Manejar envío de formulario de artículo
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
            await db.collection('articulos').doc(articleId).update(articleData);
        } else {
            // Crear nuevo artículo
            await db.collection('articulos').add(articleData);
        }
        
        // Cerrar modal y recargar artículos
        document.getElementById('article-modal').style.display = 'none';
        loadArticles();
    } catch (error) {
        console.error('Error saving article:', error);
        alert('Error al guardar el artículo: ' + error.message);
    }
}

// Editar artículo
function editArticle(articleId) {
    openArticleModal(articleId);
}

// Eliminar artículo
async function deleteArticle(articleId) {
    if (!userPermissions.isAdmin) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
        try {
            await db.collection('articulos').doc(articleId).delete();
            loadArticles();
        } catch (error) {
            console.error('Error deleting article:', error);
            alert('Error al eliminar el artículo: ' + error.message);
        }
    }
}

// Renderizar lugares
function renderPlaces() {
    placesList.innerHTML = '';
    
    places.forEach(place => {
        const placeItem = document.createElement('div');
        placeItem.className = 'item-item';
        
        placeItem.innerHTML = `
            <div class="item-details">
                <strong>${place.nombre}</strong>
                <div>Sector: ${place.sector}</div>
            </div>
            <div class="item-actions">
                <button class="btn-neon-small" onclick="editPlace('${place.id}')">Editar</button>
                <button class="btn-neon-small" onclick="deletePlace('${place.id}')">Eliminar</button>
            </div>
        `;
        
        placesList.appendChild(placeItem);
    });
}

// Abrir modal de lugar
function openPlaceModal(placeId = null) {
    const modal = document.getElementById('place-modal');
    const title = document.getElementById('modal-place-title');
    const form = document.getElementById('place-form');
    const placeIdField = document.getElementById('place-id');
    
    if (placeId) {
        // Modo edición
        title.textContent = 'Editar Lugar';
        placeIdField.value = placeId;
        
        // Cargar datos del lugar
        const place = places.find(p => p.id === placeId);
        if (place) {
            document.getElementById('place-name').value = place.nombre;
            document.getElementById('place-sector').value = place.sector;
        }
    } else {
        // Modo nuevo
        title.textContent = 'Nuevo Lugar';
        placeIdField.value = '';
        form.reset();
    }
    
    modal.style.display = 'block';
}

// Manejar envío de formulario de lugar
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
            await db.collection('lugares').doc(placeId).update(placeData);
        } else {
            // Crear nuevo lugar
            await db.collection('lugares').add(placeData);
        }
        
        // Cerrar modal y recargar lugares
        document.getElementById('place-modal').style.display = 'none';
        loadPlaces();
    } catch (error) {
        console.error('Error saving place:', error);
        alert('Error al guardar el lugar: ' + error.message);
    }
}

// Editar lugar
function editPlace(placeId) {
    openPlaceModal(placeId);
}

// Eliminar lugar
async function deletePlace(placeId) {
    if (!userPermissions.isAdmin) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar este lugar?')) {
        try {
            await db.collection('lugares').doc(placeId).delete();
            loadPlaces();
        } catch (error) {
            console.error('Error deleting place:', error);
            alert('Error al eliminar el lugar: ' + error.message);
        }
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