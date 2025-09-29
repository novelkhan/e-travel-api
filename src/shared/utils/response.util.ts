// src/shared/utils/response.util.ts
export class ResponseUtil {
  static success(title: string, message: string) {
    return { 
      value: {
        title, 
        message 
      }
    };
  }

  static successWithData(title: string, message: string, data: any) {
    return { 
      value: {
        title, 
        message,
        ...data 
      }
    };
  }

  static successData(data: any) {
    return data;
  }

  static successMessage(message: string) {
    return { 
      value: {
        message 
      }
    };
  }
}