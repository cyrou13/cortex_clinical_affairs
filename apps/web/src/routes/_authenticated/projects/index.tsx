import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { Plus, FolderOpen } from 'lucide-react';
import { ProjectCard } from '../../../features/project/components/ProjectCard';
import { ProjectCreateWizard } from '../../../features/project/components/ProjectCreateWizard';

const PROJECTS_QUERY = gql`
  query Projects {
    projects {
      id
      name
      deviceName
      deviceClass
      regulatoryContext
      status
      createdAt
    }
  }
`;

const USERS_QUERY = gql`
  query UsersForAssignment {
    users(limit: 100) {
      users {
        id
        name
        email
      }
    }
  }
`;

const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject(
    $name: String!
    $deviceName: String!
    $deviceClass: String!
    $regulatoryContext: String!
  ) {
    createProject(
      name: $name
      deviceName: $deviceName
      deviceClass: $deviceClass
      regulatoryContext: $regulatoryContext
    ) {
      id
      name
    }
  }
`;

const CONFIGURE_CEP_MUTATION = gql`
  mutation ConfigureCep(
    $projectId: String!
    $scope: String
    $objectives: String
    $deviceClassification: String
    $clinicalBackground: String
  ) {
    configureCep(
      projectId: $projectId
      scope: $scope
      objectives: $objectives
      deviceClassification: $deviceClassification
      clinicalBackground: $clinicalBackground
    ) {
      id
    }
  }
`;

const ASSIGN_USERS_MUTATION = gql`
  mutation AssignProjectUsers($projectId: String!, $userIds: [String!]!) {
    assignProjectUsers(projectId: $projectId, userIds: $userIds) {
      id
    }
  }
`;

interface Project {
  id: string;
  name: string;
  deviceName: string;
  deviceClass: string;
  regulatoryContext: string;
  status: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  const { data, loading } = useQuery<{ projects: Project[] }>(PROJECTS_QUERY);
  const { data: usersData } = useQuery<{
    users: { users: Array<{ id: string; name: string; email: string }> };
  }>(USERS_QUERY);

  const [createProject] = useMutation(CREATE_PROJECT_MUTATION);
  const [configureCep] = useMutation(CONFIGURE_CEP_MUTATION);
  const [assignUsers] = useMutation(ASSIGN_USERS_MUTATION);

  const projects = data?.projects ?? [];
  const availableUsers = usersData?.users?.users ?? [];

  const handleCreateProject = async (
    formData: {
      name: string;
      deviceName: string;
      deviceClass: string;
      regulatoryContext: string;
      cepScope: string;
      cepObjectives: string;
      cepDeviceClassification: string;
      cepClinicalBackground: string;
    },
    teamMembers: Array<{ userId: string; role: string }>,
  ) => {
    const { data: result } = await createProject({
      variables: {
        name: formData.name,
        deviceName: formData.deviceName,
        deviceClass: formData.deviceClass,
        regulatoryContext: formData.regulatoryContext,
      },
      refetchQueries: [{ query: PROJECTS_QUERY }],
    });

    const projectId = (result as any)?.createProject?.id;
    if (!projectId) return;

    // Configure CEP if any fields were filled
    if (formData.cepScope || formData.cepObjectives || formData.cepDeviceClassification || formData.cepClinicalBackground) {
      await configureCep({
        variables: {
          projectId,
          scope: formData.cepScope || null,
          objectives: formData.cepObjectives || null,
          deviceClassification: formData.cepDeviceClassification || null,
          clinicalBackground: formData.cepClinicalBackground || null,
        },
      });
    }

    // Assign team members
    if (teamMembers.length > 0) {
      await assignUsers({
        variables: {
          projectId,
          userIds: teamMembers.map((m) => m.userId),
        },
      });
    }

    setShowCreateWizard(false);
  };

  const handleProjectClick = (id: string) => {
    window.location.href = `/projects/${id}`;
  };

  if (showCreateWizard) {
    return (
      <div className="p-6">
        <ProjectCreateWizard
          availableUsers={availableUsers}
          onSubmit={handleCreateProject}
          onCancel={() => setShowCreateWizard(false)}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-[var(--cortex-text-muted)]">Loading projects...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--cortex-text-primary)]">Projects</h1>
        <button
          type="button"
          onClick={() => setShowCreateWizard(true)}
          className="flex items-center gap-2 rounded-md bg-[var(--cortex-blue-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Onboarding banner for first-time users */}
      {projects.length === 0 && (
        <div className="mb-6 rounded-lg border border-[var(--cortex-blue-200)] bg-[var(--cortex-blue-50)] p-6 text-center">
          <FolderOpen size={48} className="mx-auto mb-3 text-[var(--cortex-blue-400)]" />
          <h2 className="mb-2 text-lg font-medium text-[var(--cortex-text-primary)]">
            Welcome to CORTEX
          </h2>
          <p className="mb-4 text-sm text-[var(--cortex-text-secondary)]">
            Create your first project to get started with your clinical evaluation.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateWizard(true)}
            className="rounded-md bg-[var(--cortex-blue-500)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--cortex-blue-600)]"
          >
            Get Started
          </button>
        </div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              deviceName={project.deviceName}
              deviceClass={project.deviceClass}
              regulatoryContext={project.regulatoryContext}
              createdAt={project.createdAt}
              onClick={handleProjectClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
