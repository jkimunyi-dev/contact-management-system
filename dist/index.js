// Contact Class
class Contact {
    constructor(firstName, lastName, email, phone, address, id) {
        this.id = id || this.generateId();
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
    getFullName() {
        return `${this.firstName} ${this.lastName}`.trim();
    }
    update(data) {
        Object.assign(this, data);
        this.updatedAt = new Date();
    }
    toJSON() {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            phone: this.phone,
            address: this.address,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    static fromJSON(data) {
        const contact = new Contact(data.firstName, data.lastName, data.email, data.phone, data.address, data.id);
        contact.createdAt = new Date(data.createdAt);
        contact.updatedAt = new Date(data.updatedAt);
        return contact;
    }
}
// Local Storage Implementation
class LocalStorageManager {
    constructor() {
        this.STORAGE_KEY = 'contact_management_contacts';
    }
    save(contacts) {
        try {
            const data = contacts.map(contact => contact.toJSON());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        }
        catch (error) {
            console.error('Failed to save contacts to localStorage:', error);
            throw new Error('Failed to save contacts');
        }
    }
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data)
                return [];
            const parsed = JSON.parse(data);
            return parsed.map(contactData => Contact.fromJSON(contactData));
        }
        catch (error) {
            console.error('Failed to load contacts from localStorage:', error);
            return [];
        }
    }
    clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        }
        catch (error) {
            console.error('Failed to clear contacts from localStorage:', error);
        }
    }
}
// Contact Manager Class
class ContactManager {
    constructor(storage) {
        this.contacts = [];
        this.filteredContacts = [];
        this.storage = storage;
        this.loadContacts();
    }
    loadContacts() {
        this.contacts = this.storage.load();
        this.filteredContacts = [...this.contacts];
    }
    saveContacts() {
        this.storage.save(this.contacts);
    }
    addContact(contactData) {
        // Validate email uniqueness
        if (this.findByEmail(contactData.email)) {
            throw new Error('A contact with this email already exists');
        }
        const contact = new Contact(contactData.firstName, contactData.lastName, contactData.email, contactData.phone, contactData.address);
        this.contacts.push(contact);
        this.saveContacts();
        this.applyCurrentFilter();
        return contact;
    }
    updateContact(id, updateData) {
        const contact = this.findById(id);
        if (!contact) {
            throw new Error('Contact not found');
        }
        // Validate email uniqueness if email is being updated
        if (updateData.email && updateData.email !== contact.email) {
            const existingContact = this.findByEmail(updateData.email);
            if (existingContact && existingContact.id !== id) {
                throw new Error('A contact with this email already exists');
            }
        }
        contact.update(updateData);
        this.saveContacts();
        this.applyCurrentFilter();
        return contact;
    }
    deleteContact(id) {
        const index = this.contacts.findIndex(contact => contact.id === id);
        if (index === -1) {
            return false;
        }
        this.contacts.splice(index, 1);
        this.saveContacts();
        this.applyCurrentFilter();
        return true;
    }
    findById(id) {
        return this.contacts.find(contact => contact.id === id);
    }
    findByEmail(email) {
        return this.contacts.find(contact => contact.email.toLowerCase() === email.toLowerCase());
    }
    getAllContacts() {
        return [...this.contacts];
    }
    getFilteredContacts() {
        return [...this.filteredContacts];
    }
    searchContacts(query) {
        if (!query.trim()) {
            this.filteredContacts = [...this.contacts];
            return this.filteredContacts;
        }
        const searchTerm = query.toLowerCase().trim();
        this.filteredContacts = this.contacts.filter(contact => contact.firstName.toLowerCase().includes(searchTerm) ||
            contact.lastName.toLowerCase().includes(searchTerm) ||
            contact.email.toLowerCase().includes(searchTerm) ||
            contact.getFullName().toLowerCase().includes(searchTerm));
        return this.filteredContacts;
    }
    applyCurrentFilter() {
        // Maintain current search filter after data changes
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            this.searchContacts(searchInput.value);
        }
        else {
            this.filteredContacts = [...this.contacts];
        }
    }
    getContactCount() {
        return this.contacts.length;
    }
    getFilteredContactCount() {
        return this.filteredContacts.length;
    }
    clearAllContacts() {
        this.contacts = [];
        this.filteredContacts = [];
        this.storage.clear();
    }
}
// UI Manager Class
class ContactUIManager {
    constructor(contactManager) {
        this.currentEditingId = null;
        this.deleteContactId = null;
        this.contactManager = contactManager;
        this.initializeDOM();
        this.setupEventListeners();
        this.renderContacts();
        this.updateContactCount();
    }
    initializeDOM() {
        this.form = document.getElementById('contactForm');
        this.contactsList = document.getElementById('contactsList');
        this.searchInput = document.getElementById('searchInput');
        this.contactCount = document.getElementById('contactCount');
        this.submitBtn = document.getElementById('submitBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.deleteModal = document.getElementById('deleteModal');
        if (!this.form || !this.contactsList || !this.searchInput || !this.contactCount ||
            !this.submitBtn || !this.cancelBtn || !this.deleteModal) {
            throw new Error('Required DOM elements not found');
        }
    }
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', this.handleFormSubmit.bind(this));
        // Cancel button
        this.cancelBtn.addEventListener('click', this.handleCancel.bind(this));
        // Search functionality
        this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        // Clear search
        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', this.handleClearSearch.bind(this));
        }
        // Delete modal
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        const cancelDeleteBtn = document.getElementById('cancelDelete');
        if (confirmDeleteBtn && cancelDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', this.handleConfirmDelete.bind(this));
            cancelDeleteBtn.addEventListener('click', this.handleCancelDelete.bind(this));
        }
        // Close modal when clicking outside
        this.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.deleteModal) {
                this.handleCancelDelete();
            }
        });
    }
    handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(this.form);
        const contactData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone') || undefined,
            address: formData.get('address') || undefined
        };
        try {
            if (this.currentEditingId) {
                // Update existing contact
                this.contactManager.updateContact(this.currentEditingId, contactData);
                this.showMessage('Contact updated successfully!', 'success');
            }
            else {
                // Add new contact
                this.contactManager.addContact(contactData);
                this.showMessage('Contact added successfully!', 'success');
            }
            this.resetForm();
            this.renderContacts();
            this.updateContactCount();
        }
        catch (error) {
            this.showMessage(error instanceof Error ? error.message : 'An error occurred', 'error');
        }
    }
    handleCancel() {
        this.resetForm();
    }
    handleSearch() {
        const query = this.searchInput.value;
        this.contactManager.searchContacts(query);
        this.renderContacts();
    }
    handleClearSearch() {
        this.searchInput.value = '';
        this.contactManager.searchContacts('');
        this.renderContacts();
    }
    handleEditContact(id) {
        const contact = this.contactManager.findById(id);
        if (!contact) {
            this.showMessage('Contact not found', 'error');
            return;
        }
        this.currentEditingId = id;
        this.populateForm(contact);
        this.submitBtn.textContent = 'Update Contact';
        this.cancelBtn.style.display = 'inline-block';
        // Scroll to form
        document.querySelector('.add-contact-section')?.scrollIntoView({ behavior: 'smooth' });
    }
    handleDeleteContact(id) {
        this.deleteContactId = id;
        this.deleteModal.style.display = 'block';
    }
    handleConfirmDelete() {
        if (this.deleteContactId) {
            const success = this.contactManager.deleteContact(this.deleteContactId);
            if (success) {
                this.showMessage('Contact deleted successfully!', 'success');
                this.renderContacts();
                this.updateContactCount();
            }
            else {
                this.showMessage('Failed to delete contact', 'error');
            }
        }
        this.handleCancelDelete();
    }
    handleCancelDelete() {
        this.deleteModal.style.display = 'none';
        this.deleteContactId = null;
    }
    resetForm() {
        this.form.reset();
        this.currentEditingId = null;
        this.submitBtn.textContent = 'Add Contact';
        this.cancelBtn.style.display = 'none';
    }
    populateForm(contact) {
        document.getElementById('firstName').value = contact.firstName;
        document.getElementById('lastName').value = contact.lastName;
        document.getElementById('email').value = contact.email;
        document.getElementById('phone').value = contact.phone || '';
        document.getElementById('address').value = contact.address || '';
    }
    renderContacts() {
        const contacts = this.contactManager.getFilteredContacts();
        if (contacts.length === 0) {
            this.contactsList.innerHTML = `
                <div class="no-contacts">
                    <p>${this.searchInput.value.trim() ? 'No contacts match your search.' : 'No contacts found. Add your first contact above!'}</p>
                </div>
            `;
            return;
        }
        this.contactsList.innerHTML = contacts.map(contact => this.createContactCard(contact)).join('');
        // Add event listeners to action buttons
        this.contactsList.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (id)
                    this.handleEditContact(id);
            });
        });
        this.contactsList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (id)
                    this.handleDeleteContact(id);
            });
        });
    }
    createContactCard(contact) {
        return `
            <div class="contact-card fade-in">
                <div class="contact-header">
                    <h3 class="contact-name">${this.escapeHtml(contact.getFullName())}</h3>
                    <div class="contact-actions">
                        <button class="btn btn-edit" data-id="${contact.id}">Edit</button>
                        <button class="btn btn-delete" data-id="${contact.id}">Delete</button>
                    </div>
                </div>
                <div class="contact-info">
                    <p><strong>Email:</strong> ${this.escapeHtml(contact.email)}</p>
                    ${contact.phone ? `<p><strong>Phone:</strong> ${this.escapeHtml(contact.phone)}</p>` : ''}
                    ${contact.address ? `<p><strong>Address:</strong> ${this.escapeHtml(contact.address)}</p>` : ''}
                    <p><strong>Added:</strong> ${contact.createdAt.toLocaleDateString()}</p>
                </div>
            </div>
        `;
    }
    updateContactCount() {
        this.contactCount.textContent = this.contactManager.getContactCount().toString();
    }
    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
            // Auto-remove message after 5 seconds
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
// Application Class
class ContactManagementApp {
    constructor() {
        this.initialize();
    }
    initialize() {
        try {
            const storage = new LocalStorageManager();
            this.contactManager = new ContactManager(storage);
            this.uiManager = new ContactUIManager(this.contactManager);
            console.log('Contact Management System initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Contact Management System:', error);
            this.showInitializationError();
        }
    }
    showInitializationError() {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="message error">
                    <h2>Initialization Error</h2>
                    <p>Failed to initialize the Contact Management System. Please refresh the page and try again.</p>
                </div>
            `;
        }
    }
    getContactManager() {
        return this.contactManager;
    }
    getUIManager() {
        return this.uiManager;
    }
}
// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ContactManagementApp();
});
// Export classes for potential external use
export { Contact, ContactManager, LocalStorageManager, ContactUIManager, ContactManagementApp };
