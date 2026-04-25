export type CodeFile = 'UserCard' | 'UserList' | 'useUsers' | 'userService' | 'types';

export interface CodeFileData {
  code: string;
  language: string;
  label: string;
  description: string;
}

export const CODE_FILES: Record<CodeFile, CodeFileData> = {
  types: {
    code: `export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  avatar?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
}

export interface UserFilters {
  role?: User['role'];
  isActive?: boolean;
  search?: string;
}`,
    language: 'typescript',
    label: 'types.ts',
    description: 'TypeScript type definitions for User domain',
  },
  
  userService: {
    code: `import type { User, UserFilters } from './types';

export class UserService {
  private baseUrl = '/api/users';

  async getUsers(filters?: UserFilters): Promise<User[]> {
    const params = new URLSearchParams();
    
    if (filters?.role) params.append('role', filters.role);
    if (filters?.isActive !== undefined) {
      params.append('isActive', String(filters.isActive));
    }
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(\`\${this.baseUrl}?\${params}\`);
    if (!response.ok) throw new Error('Failed to fetch users');
    
    return response.json();
  }

  async getUserById(id: string): Promise<User> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`);
    if (!response.ok) throw new Error('User not found');
    
    return response.json();
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`, {
      method: 'DELETE',
    });
    
    if (!response.ok) throw new Error('Failed to delete user');
  }
}

export const userService = new UserService();`,
    language: 'typescript',
    label: 'userService.ts',
    description: 'API service for user operations',
  },

  useUsers: {
    code: `import { useState, useEffect } from 'react';
import { userService } from './userService';
import type { User, UserFilters } from './types';

export function useUsers(filters?: UserFilters) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUsers() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await userService.getUsers(filters);
        
        if (isMounted) {
          setUsers(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [filters?.role, filters?.isActive, filters?.search]);

  const refreshUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getUsers(filters);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return { users, isLoading, error, refreshUsers };
}`,
    language: 'typescript',
    label: 'useUsers.ts',
    description: 'Custom React hook for fetching users',
  },

  UserCard: {
    code: `import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Trash2, Edit } from 'lucide-react';
import type { User } from './types';

interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  const getRoleBadgeVariant = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'user': return 'default';
      case 'guest': return 'secondary';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg">{user.name}</h3>
            <Badge variant={getRoleBadgeVariant(user.role)}>
              {user.role}
            </Badge>
          </div>
        </div>
        <Badge variant={user.isActive ? 'default' : 'outline'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {onEdit && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEdit(user)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => onDelete(user.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}`,
    language: 'typescript',
    label: 'UserCard.tsx',
    description: 'User card component displaying user info',
  },

  UserList: {
    code: `import React, { useState } from 'react';
import { useUsers } from './useUsers';
import { UserCard } from './UserCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import type { User, UserFilters } from './types';

export function UserList() {
  const [filters, setFilters] = useState<UserFilters>({});
  const { users, isLoading, error, refreshUsers } = useUsers(filters);

  const handleRoleFilter = (role: string) => {
    setFilters(prev => ({
      ...prev,
      role: role === 'all' ? undefined : role as User['role'],
    }));
  };

  const handleSearch = (search: string) => {
    setFilters(prev => ({
      ...prev,
      search: search || undefined,
    }));
  };

  const handleEdit = (user: User) => {
    console.log('Edit user:', user);
    // TODO: Implement edit functionality
  };

  const handleDelete = async (userId: string) => {
    console.log('Delete user:', userId);
    // TODO: Implement delete functionality
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            placeholder="Search users..."
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Select onValueChange={handleRoleFilter} defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={refreshUsers}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-destructive">
          <p>Error: {error}</p>
        </div>
      )}

      {/* User Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No users found</p>
        </div>
      )}
    </div>
  );
}`,
    language: 'typescript',
    label: 'UserList.tsx',
    description: 'User list component with filtering',
  },
};

