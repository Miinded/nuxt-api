import type { RuntimeConfig } from 'nuxt/schema';
import axios, { type AxiosRequestConfig } from 'axios';
import { useRuntimeConfig } from '#app';

class apiResponse {
  _error: any = null;
  _response: any = null;
  _data: any = null;

  setData(res: any) {
    this._response = res;
    this._data = res.data;

    if (this._data.error) {
      this.setError({ response: this._response });
    }
  }

  setError(error: any) {
    this._error = error;

    if (this._error?.response && this._error?.response.data) {
      this._data = this._error?.response.data;
    }
  }

  error() {
    return this._error !== null;
  }

  errorMsg() {
    if (this._error.response && this._error.response.data.message) {
      return this._error.response.data.message;
    }
    return this._error;
  }

  data<T>(): T {
    return this._data as T;
  }

  payload() {
    return this._data.payload;
  }
}

const axiosInstance = axios.create();

async function run(method: string, url: string, datas?: any, options: AxiosRequestConfig = {}) {
  const response = new apiResponse();
  let res = null;
  try {
    const config: RuntimeConfig = useRuntimeConfig();
    const _url = url.match(/http?/) ? url : config.public.BACKEND_URI + url;

    // Ajouter les paramètres d'interception pour suivre les tentatives et le nombre maximum d'essais
    const requestOptions: AxiosRequestConfig = {
      ...options,
    };

    switch (method) {
      case 'get':
        res = await axiosInstance.get(_url, requestOptions);
        break;
      case 'post':
        res = await axiosInstance.post(_url, datas, requestOptions);
        break;
      case 'put':
        res = await axiosInstance.put(_url, datas, requestOptions);
        break;
      case 'delete':
        res = await axiosInstance.delete(_url, requestOptions);
        break;
    }

    response.setData(res);
  } catch (e) {
    response.setError(e || 'server');
  }

  return response;
}

const api = {
  async run(method: string, url: string, datas?: any, options?: AxiosRequestConfig) {
    return await run(method, url, datas, options);
  },
  async get(url: string, datas?: any, options?: AxiosRequestConfig) {
    return await run('get', url, datas, options);
  },
  async getData<T>(url: string, datas?: any, options?: AxiosRequestConfig) {
    const result = await run('get', url, datas, options);
    if (result.error()) {
      throw new Error(result.errorMsg());
    }
    return result.data<T>();
  },
  async post(url: string, datas?: any, options?: AxiosRequestConfig) {
    return await run('post', url, datas, options);
  },
  async put(url: string, datas?: any, options?: AxiosRequestConfig) {
    return await run('put', url, datas, options);
  },
  async delete(url: string, datas?: any, options?: AxiosRequestConfig) {
    return await run('delete', url, datas, options);
  },
};

export default api;
