// Contact Interface
interface IContact {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Contact Class
class Contact implements IContact {
    public id: string;
    public firstName: string;
    public lastName: string;
    public email: string;
    public phone?: string;
    public address?: string;
    public createdAt: Date;
    public updatedAt: Date;

    constructor(
        firstName: string,
        lastName: string,
        email: string,
        phone?: string,
        address?: string,
        id?: string
    ) {
        this.id = id || this.generateId();
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    public getFullName(): string {
        return `${this.firstName} ${this.lastName}`.trim();
    }

    public update(data: Partial<Omit<IContact, 'id' | 'createdAt' | 'updatedAt'>>): void {
        Object.assign(this, data);
        this.updatedAt = new Date();
    }

    public toJSON(): IContact {
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

    public static fromJSON(data: IContact): Contact {
        const contact = new Contact(
            data.firstName,
            data.lastName,
            data.email,
            data.phone,
            data.address,
            data.id
        );
        contact.createdAt = new Date(data.createdAt);
        contact.updatedAt = new Date(data.updatedAt);
        return contact;
    }
}

// Storage Interface
interface IContactStorage {
    save(contacts: Contact[]): void;
    load(): Contact[];
    clear(): void;
}

// Local Storage Implementation
class LocalStorageManager implements IContactStorage {
    private readonly STORAGE_KEY = 'contact_management_contacts';

    public save(contacts: Contact[]): void {
        try {
            const data = contacts.map(contact => contact.toJSON());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save contacts to localStorage:', error);
            throw new Error('Failed to save contacts');
        }
    }

    public load(): Contact[] {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) return [];
            
            const parsed: IContact[] = JSON.parse(data);
            return parsed.map(contactData => Contact.fromJSON(contactData));
        } catch (error) {
            console.error('Failed to load contacts from localStorage:', error);
            return [];
        }
    }

    public clear(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear contacts from localStorage:', error);
        }
    }
}

// Contact Manager Class
class ContactManager {
    private contacts: Contact[] = [];
    private storage: IContactStorage;
    private filteredContacts: Contact[] = [];

    constructor(storage: IContactStorage) {
        this.storage = storage;
        this.loadContacts();
    }

    private loadContacts(): void {
        this.contacts = this.storage.load();
        this.filteredContacts = [...this.contacts];
    }

    private saveContacts(): void {
        this.storage.save(this.contacts);
    }

    public addContact(contactData: Omit<IContact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
        // Validate email uniqueness
        if (this.findByEmail(contactData.email)) {
            throw new Error('A contact with this email already exists');
        }

        const contact = new Contact(
            contactData.firstName,
            contactData.lastName,
            contactData.email,
            contactData.phone,
            contactData.address
        );

        this.contacts.push(contact);
        this.saveContacts();
        this.applyCurrentFilter();
        return contact;
    }

    public updateContact(id: string, updateData: Partial<Omit<IContact, 'id' | 'createdAt' | 'updatedAt'>>): Contact {
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

    public deleteContact(id: string): boolean {
        const index = this.contacts.findIndex(contact => contact.id === id);
        if (index === -1) {
            return false;
        }

        this.contacts.splice(index, 1);
        this.saveContacts();
        this.applyCurrentFilter();
        return true;
    }

    public findById(id: string): Contact | undefined {
        return this.contacts.find(contact => contact.id === id);
    }

    public findByEmail(email: string): Contact | undefined {
        return this.contacts.find(contact => contact.email.toLowerCase() === email.toLowerCase());
    }

    public getAllContacts(): Contact[] {
        return [...this.contacts];
    }

    public getFilteredContacts(): Contact[] {
        return [...this.filteredContacts];
    }

    public searchContacts(query: string): Contact[] {
        if (!query.trim()) {
            this.filteredContacts = [...this.contacts];
            return this.filteredContacts;
        }

        const searchTerm = query.toLowerCase().trim();
        this.filteredContacts = this.contacts.filter(contact =>
            contact.firstName.toLowerCase().includes(searchTerm) ||
            contact.lastName.toLowerCase().includes(searchTerm) ||
            contact.email.toLowerCase().includes(searchTerm) ||
            contact.getFullName().toLowerCase().includes(searchTerm)
        );

        return this.filteredContacts;
    }

    private applyCurrentFilter(): void {
        // Maintain current search filter after data changes
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        if (searchInput && searchInput.value.trim()) {
            this.searchContacts(searchInput.value);
        } else {
            this.filteredContacts = [...this.contacts];
        }
    }

    public getContactCount(): number {
        return this.contacts.length;
    }

    public getFilteredContactCount(): number {
        return this.filteredContacts.length;
    }

    public clearAllContacts(): void {
        this.contacts = [];
        this.filteredContacts = [];
        this.storage.clear();
    }
}

// UI Manager Class
class ContactUIManager {
    private contactManager: ContactManager;
    private currentEditingId: string | null = null;
    private deleteContactId: string | null = null;

    // DOM Elements
    private form!: HTMLFormElement;
    private contactsList!: HTMLElement;
    private searchInput!: HTMLInputElement;
    private contactCount!: HTMLElement;
    private submitBtn!: HTMLButtonElement;
    private cancelBtn!: HTMLButtonElement;
    private deleteModal!: HTMLElement;

    constructor(contactManager: ContactManager) {
        this.contactManager = contactManager;
        this.initializeDOM();
        this.setupEventListeners();
        this.renderContacts();
        this.updateContactCount();
    }

    private initializeDOM(): void {
        this.form = document.getElementById('contactForm') as HTMLFormElement;
        this.contactsList = document.getElementById('contactsList') as HTMLElement;
        this.searchInput = document.getElementById('searchInput') as HTMLInputElement;
        this.contactCount = document.getElementById('contactCount') as HTMLElement;
        this.submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
        this.cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
        this.deleteModal = document.getElementById('deleteModal') as HTMLElement;

        if (!this.form || !this.contactsList || !this.searchInput || !this.contactCount || 
            !this.submitBtn || !this.cancelBtn || !this.deleteModal) {
            throw new Error('Required DOM elements not found');
        }
    }

    private setupEventListeners(): void {
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

    private handleFormSubmit(e: Event): void {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const contactData = {
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string || undefined,
            address: formData.get('address') as string || undefined
        };

        try {
            if (this.currentEditingId) {
                // Update existing contact
                this.contactManager.updateContact(this.currentEditingId, contactData);
                this.showMessage('Contact updated successfully!', 'success');
            } else {
                // Add new contact
                this.contactManager.addContact(contactData);
                this.showMessage('Contact added successfully!', 'success');
            }

            this.resetForm();
            this.renderContacts();
            this.updateContactCount();
        } catch (error) {
            this.showMessage(error instanceof Error ? error.message : 'An error occurred', 'error');
        }
    }

    private handleCancel(): void {
        this.resetForm();
    }

    private handleSearch(): void {
        const query = this.searchInput.value;
        this.contactManager.searchContacts(query);
        this.renderContacts();
    }

    private handleClearSearch(): void {
        this.searchInput.value = '';
        this.contactManager.searchContacts('');
        this.renderContacts();
    }

    private handleEditContact(id: string): void {
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

    private handleDeleteContact(id: string): void {
        this.deleteContactId = id;
        this.deleteModal.style.display = 'block';
    }

    private handleConfirmDelete(): void {
        if (this.deleteContactId) {
            const success = this.contactManager.deleteContact(this.deleteContactId);
            if (success) {
                this.showMessage('Contact deleted successfully!', 'success');
                this.renderContacts();
                this.updateContactCount();
            } else {
                this.showMessage('Failed to delete contact', 'error');
            }
        }
        this.handleCancelDelete();
    }

    private handleCancelDelete(): void {
        this.deleteModal.style.display = 'none';
        this.deleteContactId = null;
    }

    private resetForm(): void {
        this.form.reset();
        this.currentEditingId = null;
        this.submitBtn.textContent = 'Add Contact';
        this.cancelBtn.style.display = 'none';
    }

    private populateForm(contact: Contact): void {
        (document.getElementById('firstName') as HTMLInputElement).value = contact.firstName;
        (document.getElementById('lastName') as HTMLInputElement).value = contact.lastName;
        (document.getElementById('email') as HTMLInputElement).value = contact.email;
        (document.getElementById('phone') as HTMLInputElement).value = contact.phone || '';
        (document.getElementById('address') as HTMLTextAreaElement).value = contact.address || '';
    }

    private renderContacts(): void {
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
                const id = (e.target as HTMLElement).dataset.id;
                if (id) this.handleEditContact(id);
            });
        });

        this.contactsList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.target as HTMLElement).dataset.id;
                if (id) this.handleDeleteContact(id);
            });
        });
    }

    private createContactCard(contact: Contact): string {
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

    private updateContactCount(): void {
        this.contactCount.textContent = this.contactManager.getContactCount().toString();
    }

    private showMessage(message: string, type: 'success' | 'error'): void {
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

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Application Class
class ContactManagementApp {
    private contactManager!: ContactManager;
    private uiManager!: ContactUIManager;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        try {
            const storage = new LocalStorageManager();
            this.contactManager = new ContactManager(storage);
            this.uiManager = new ContactUIManager(this.contactManager);
            
            console.log('Contact Management System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Contact Management System:', error);
            this.showInitializationError();
        }
    }

    private showInitializationError(): void {
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

    public getContactManager(): ContactManager {
        return this.contactManager;
    }

    public getUIManager(): ContactUIManager {
        return this.uiManager;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ContactManagementApp();
});

// Export classes for potential external use
export { Contact, ContactManager, LocalStorageManager, ContactUIManager, ContactManagementApp };
export type { IContact, IContactStorage };