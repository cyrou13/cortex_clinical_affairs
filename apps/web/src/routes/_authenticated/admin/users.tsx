import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { UserManagementTable } from '../../../features/auth/components/UserManagementTable';
import { UserCreateDialog } from '../../../features/auth/components/UserCreateDialog';
import { UserEditDialog } from '../../../features/auth/components/UserEditDialog';

const USERS_QUERY = gql`
  query Users($role: String, $isActive: Boolean, $search: String, $limit: Int, $offset: Int) {
    users(role: $role, isActive: $isActive, search: $search, limit: $limit, offset: $offset) {
      users {
        id
        name
        email
        role
        isActive
        mfaEnabled
        lastLoginAt
        createdAt
      }
      total
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($email: String!, $name: String!, $role: String!) {
    createUser(email: $email, name: $name, role: $role) {
      id
      name
      email
      role
      isActive
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: String!, $name: String, $role: String) {
    updateUser(id: $id, name: $name, role: $role) {
      id
      name
      role
    }
  }
`;

const DEACTIVATE_USER = gql`
  mutation DeactivateUser($id: String!) {
    deactivateUser(id: $id) {
      id
      isActive
    }
  }
`;

const REACTIVATE_USER = gql`
  mutation ReactivateUser($id: String!) {
    reactivateUser(id: $id) {
      id
      isActive
    }
  }
`;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, refetch } = useQuery<{ users: { users: User[]; total: number } }>(USERS_QUERY, {
    variables: {
      role: filterRole || undefined,
      isActive: filterStatus === '' ? undefined : filterStatus === 'active',
      search: searchQuery || undefined,
      limit: 50,
      offset: 0,
    },
  });

  const [createUser] = useMutation(CREATE_USER, { onCompleted: () => refetch() });
  const [updateUser] = useMutation(UPDATE_USER, { onCompleted: () => refetch() });
  const [deactivateUser] = useMutation(DEACTIVATE_USER, { onCompleted: () => refetch() });
  const [reactivateUser] = useMutation(REACTIVATE_USER, { onCompleted: () => refetch() });

  const users: User[] = data?.users?.users ?? [];
  const total: number = data?.users?.total ?? 0;

  return (
    <div className="mx-auto max-w-6xl">
      <UserManagementTable
        users={users}
        total={total}
        onAddUser={() => setShowCreate(true)}
        onEditUser={(user) => setEditingUser(user)}
        onDeactivateUser={(id) => deactivateUser({ variables: { id } })}
        onReactivateUser={(id) => reactivateUser({ variables: { id } })}
        filterRole={filterRole}
        onFilterRoleChange={setFilterRole}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <UserCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => {
          createUser({ variables: data });
          setShowCreate(false);
        }}
      />

      <UserEditDialog
        open={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={(id, changes) => {
          updateUser({ variables: { id, ...changes } });
          setEditingUser(null);
        }}
      />
    </div>
  );
}
