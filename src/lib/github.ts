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

interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

interface GitHubLanguages {
  [language: string]: number;
}

const GITHUB_API_BASE = 'https://api.github.com';

async function fetchWithAuth(url: string): Promise<Response> {
  const token = import.meta.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Portfolio-Site',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { headers });
}

async function getRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  try {
    const response = await fetchWithAuth(`${GITHUB_API_BASE}/repos/${owner}/${repo}/languages`);
    if (!response.ok) return {};

    const languages: GitHubLanguages = await response.json();
    const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);

    // Convert bytes to percentages
    const percentages: Record<string, number> = {};
    for (const [lang, bytes] of Object.entries(languages)) {
      percentages[lang] = Math.round((bytes / total) * 100);
    }

    return percentages;
  } catch {
    return {};
  }
}

export async function fetchGitHubProjects(username: string): Promise<Project[]> {
  try {
    const response = await fetchWithAuth(
      `${GITHUB_API_BASE}/users/${username}/repos?type=owner&sort=pushed&per_page=30`
    );

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`);
      return [];
    }

    const repos: GitHubRepo[] = await response.json();

    // Filter out forks and archived repos
    const filteredRepos = repos.filter(repo => !repo.fork && !repo.archived);

    const projectsWithLanguages = await Promise.all(
      filteredRepos.slice(0, 12).map(async (repo): Promise<Project> => {
        const languages = await getRepoLanguages(username, repo.name);

        return {
          id: String(repo.id),
          name: repo.name,
          description: repo.description || 'No description available',
          topics: repo.topics,
          languages,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          url: repo.html_url,
          homepage: repo.homepage || null,
          featured: false,
        };
      })
    );

    return projectsWithLanguages;
  } catch (error) {
    console.error('Failed to fetch GitHub projects:', error);
    return [];
  }
}

export async function fetchRepoById(owner: string, repo: string): Promise<Project | null> {
  try {
    const response = await fetchWithAuth(`${GITHUB_API_BASE}/repos/${owner}/${repo}`);

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`);
      return null;
    }

    const repoData: GitHubRepo = await response.json();
    const languages = await getRepoLanguages(owner, repo);

    return {
      id: String(repoData.id),
      name: repoData.name,
      description: repoData.description || 'No description available',
      topics: repoData.topics,
      languages,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      url: repoData.html_url,
      homepage: repoData.homepage || null,
      featured: false,
    };
  } catch (error) {
    console.error('Failed to fetch GitHub repo:', error);
    return null;
  }
}
