import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RoleBasedAccessControlProps {
  requiredRoles: string[];
  children: React.ReactNode;
}

const RoleBasedAccessControl: React.FC<RoleBasedAccessControlProps> = ({ 
  requiredRoles, 
  children 
}) => {
  const { hasRole } = useAuth();
  
  // If the user has any of the required roles, render the children
  if (hasRole(requiredRoles)) {
    return <>{children}</>;
  }
  
  // Otherwise, render nothing
  return null;
};

export default RoleBasedAccessControl;