import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SecurityContextType {
    isAdminAuthenticated: boolean;
    is2faModalOpen: boolean;
    authenticateAdmin: () => void;
    logoutAdmin: () => void;
    open2faModal: () => void;
    close2faModal: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [is2faModalOpen, setIs2faModalOpen] = useState(false);

    const authenticateAdmin = () => setIsAdminAuthenticated(true);
    const logoutAdmin = () => setIsAdminAuthenticated(false);
    const open2faModal = () => setIs2faModalOpen(true);
    const close2faModal = () => setIs2faModalOpen(false);

    return (
        <SecurityContext.Provider 
            value={{ 
                isAdminAuthenticated, 
                is2faModalOpen, 
                authenticateAdmin,
                logoutAdmin,
                open2faModal,
                close2faModal
            }}
        >
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (!context) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
};
