import {
  OptionGroupOverviewDto,
  OptionGroupOccurrenceDto,
  OptionInGroupDto,
} from '@/types/dto/option-group-overview.dto';

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return process.env.API_BASE_URL || 'http://dhcp-backend:3001';
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
}
const API_BASE_URL = getApiBaseUrl();

export async function fetchOptionGroupOverview(): Promise<OptionGroupOverviewDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/option-group-overview`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch Option Group Overview');
  return res.json();
}

export async function fetchOptionGroupOccurrences(groupId: number): Promise<OptionGroupOccurrenceDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/option-group-overview/${groupId}/objects`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch Option Group Occurrences');
  return res.json();
}

export async function fetchOptionGroupOptions(groupId: number): Promise<OptionInGroupDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/option-group-overview/${groupId}/options`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch Option Group Options');
  return res.json();
}
