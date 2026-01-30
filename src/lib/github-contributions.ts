export interface ContributionDay {
  date: string;
  contributionCount: number;
  contributionLevel: 'NONE' | 'FIRST_QUARTILE' | 'SECOND_QUARTILE' | 'THIRD_QUARTILE' | 'FOURTH_QUARTILE';
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionStats {
  totalContributions: number;
  weeks: ContributionWeek[];
  longestStreak: number;
  currentStreak: number;
  averagePerDay: number;
  mostActiveDay: { date: string; count: number } | null;
}

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

export async function fetchContributionStats(username: string): Promise<ContributionStats | null> {
  const token = import.meta.env.GITHUB_TOKEN;

  if (!token) {
    console.warn('GITHUB_TOKEN not set - contribution stats require authentication');
    return null;
  }

  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { username },
      }),
    });

    if (!response.ok) {
      console.error(`GitHub GraphQL error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.errors) {
      console.error('GitHub GraphQL errors:', data.errors);
      return null;
    }

    const calendar = data.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) return null;

    const weeks: ContributionWeek[] = calendar.weeks;
    const allDays = weeks.flatMap(w => w.contributionDays);

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(allDays);

    // Find most active day
    const mostActiveDay = allDays.reduce<{ date: string; count: number } | null>(
      (max, day) => (!max || day.contributionCount > max.count)
        ? { date: day.date, count: day.contributionCount }
        : max,
      null
    );

    // Calculate average (excluding days with 0)
    const activeDays = allDays.filter(d => d.contributionCount > 0);
    const averagePerDay = activeDays.length > 0
      ? Math.round((calendar.totalContributions / activeDays.length) * 10) / 10
      : 0;

    return {
      totalContributions: calendar.totalContributions,
      weeks,
      longestStreak,
      currentStreak,
      averagePerDay,
      mostActiveDay,
    };
  } catch (error) {
    console.error('Failed to fetch contribution stats:', error);
    return null;
  }
}

function calculateStreaks(days: ContributionDay[]): { currentStreak: number; longestStreak: number } {
  // Sort by date descending (most recent first)
  const sortedDays = [...days].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().split('T')[0];
  let foundToday = false;

  for (const day of sortedDays) {
    if (day.date === today || (!foundToday && day.contributionCount > 0)) {
      foundToday = true;
    }

    if (foundToday) {
      if (day.contributionCount > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  const chronologicalDays = [...days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const day of chronologicalDays) {
    if (day.contributionCount > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
}
