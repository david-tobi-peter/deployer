import axios from 'axios';

export interface Deployment {
  id: string;
  gitUrl: string;
  status: 'PENDING' | 'BUILDING' | 'DEPLOYING' | 'RUNNING' | 'FAILED';
  commitHash?: string;
  imageTag?: string;
  port?: number;
  liveUrl?: string;
  createdAt?: string;
}

const api = axios.create({
  baseURL: '/api'
});

export const deploymentApi = {
  getAll: async (page: number = 1, limit: number = 10) => {
    const { data } = await api.get<{ data: Deployment[], total: number }>(`/deployments?page=${page}&limit=${limit}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<{ data: Deployment }>(`/deployments/${id}`);
    return data;
  },

  create: async (gitUrl: string, commitHash?: string) => {
    const { data } = await api.post<{ data: Deployment }>('/deployments', { gitUrl, commitHash });
    return data;
  }
};
