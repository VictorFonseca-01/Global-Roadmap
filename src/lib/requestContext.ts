export class RequestContext {
  private static activeRequestId: string | null = null;

  /**
   * Gera e define um novo UUID de transação/requisição para correlação e rastreabilidade de erros.
   */
  static generateId(): string {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0;
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
    this.activeRequestId = uuid;
    return uuid;
  }

  /**
   * Obtém o ID de requisição ativo ou gera um novo automaticamente caso não exista.
   */
  static getOrGenerateId(): string {
    if (!this.activeRequestId) {
      return this.generateId();
    }
    return this.activeRequestId;
  }

  /**
   * Limpa o ID ativo após o encerramento seguro do fluxo.
   */
  static clear(): void {
    this.activeRequestId = null;
  }
}
