interface GitLabProject {
  id: number;
  name: string;
  description: string | null;
  web_url: string;
  topics: string[];
  star_count: number;
  forks_count: number;
  default_branch: string;
  visibility: string;
  last_activity_at: string;
}

interface GitLabLanguages {
  [language: string]: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  topics: string[];
  languages: Record<string, number>;
  stars: number;
  forks: number;
  url: string;
  homepage: string | null;
  featured: boolean;
}

const GITLAB_API_BASE = 'https://gitlab.com/api/v4';

async function fetchWithAuth(url: string): Promise<Response> {
  const token = import.meta.env.GITLAB_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (token) {
    headers['PRIVATE-TOKEN'] = token;
  }

  return fetch(url, { headers });
}

async function getProjectLanguages(projectId: number): Promise<GitLabLanguages> {
  try {
    const response = await fetchWithAuth(`${GITLAB_API_BASE}/projects/${projectId}/languages`);
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

export async function fetchGitLabProjects(username: string): Promise<Project[]> {
  try {
    const response = await fetchWithAuth(
      `${GITLAB_API_BASE}/users/${username}/projects?visibility=public&order_by=updated_at&per_page=20`
    );

    if (!response.ok) {
      console.error(`GitLab API error: ${response.status}`);
      return [];
    }

    const projects: GitLabProject[] = await response.json();

    const projectsWithLanguages = await Promise.all(
      projects.map(async (project): Promise<Project> => {
        const languages = await getProjectLanguages(project.id);

        return {
          id: String(project.id),
          name: project.name,
          description: project.description || 'No description available',
          topics: project.topics,
          languages,
          stars: project.star_count,
          forks: project.forks_count,
          url: project.web_url,
          homepage: null,
          featured: false,
        };
      })
    );

    return projectsWithLanguages;
  } catch (error) {
    console.error('Failed to fetch GitLab projects:', error);
    return [];
  }
}

export async function fetchProjectById(projectId: number | string): Promise<Project | null> {
  try {
    const response = await fetchWithAuth(`${GITLAB_API_BASE}/projects/${projectId}`);

    if (!response.ok) {
      console.error(`GitLab API error: ${response.status}`);
      return null;
    }

    const project: GitLabProject = await response.json();
    const languages = await getProjectLanguages(project.id);

    return {
      id: String(project.id),
      name: project.name,
      description: project.description || 'No description available',
      topics: project.topics,
      languages,
      stars: project.star_count,
      forks: project.forks_count,
      url: project.web_url,
      homepage: null,
      featured: false,
    };
  } catch (error) {
    console.error('Failed to fetch GitLab project:', error);
    return null;
  }
}
