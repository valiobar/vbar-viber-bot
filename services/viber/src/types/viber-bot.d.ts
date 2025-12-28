/**
 * Type declarations for viber-bot package
 *
 * The viber-bot package doesn't provide TypeScript definitions,
 * so we define them here based on the package's API.
 */

declare module "viber-bot" {
  /**
   * Viber Bot configuration options
   */
  export interface BotOptions {
    authToken: string;
    name: string;
    avatar?: string;
    logger?: any;
  }

  /**
   * Viber Bot class
   */
  export class Bot {
    constructor(options: BotOptions);

    /**
     * Set webhook URL
     */
    setWebhook(webhookUrl: string): Promise<void>;

    /**
     * Get Express middleware for webhook handling
     */
    middleware(): any;

    /**
     * Send message to user
     */
    sendMessage(userProfile: any, messages: any[]): Promise<any>;

    /**
     * On conversation started event
     */
    onConversationStarted(
      callback: (
        userProfile: any,
        isSubscribed: boolean,
        context: string | null,
        onFinish: () => void
      ) => void
    ): void;

    /**
     * On message received event
     */
    onMessage(callback: (message: any, response: any) => void): void;

    /**
     * On message seen event
     */
    onSeen(callback: (messageId: string, userId: string) => void): void;

    /**
     * On user subscribed event
     */
    onSubscribe(callback: (response: any) => void): void;

    /**
     * On user unsubscribed event
     */
    onUnsubscribe(callback: (userId: string) => void): void;

    /**
     * On error event
     */
    onError(callback: (error: Error) => void): void;
  }

  /**
   * Message types
   */
  export namespace Message {
    export class Text {
      constructor(text: string, keyboard?: any);
      text: string;
    }

    export class Picture {
      constructor(pictureUrl: string, text?: string, keyboard?: any);
      picture: string;
      text?: string;
    }

    export class Video {
      constructor(
        videoUrl: string,
        size?: number,
        text?: string,
        keyboard?: any
      );
      video: string;
      size?: number;
      text?: string;
    }

    export class File {
      constructor(
        fileUrl: string,
        size?: number,
        fileName?: string,
        keyboard?: any
      );
      media: string;
      size?: number;
      file_name?: string;
    }

    export class Contact {
      constructor(contact: any, keyboard?: any);
      contact: any;
    }

    export class Location {
      constructor(location: any, keyboard?: any);
      location: any;
    }

    export class Url {
      constructor(url: string, keyboard?: any);
      url: string;
    }

    export class Sticker {
      constructor(stickerId: number, keyboard?: any);
      stickerId: number;
    }

    export class RichMedia {
      constructor(richMedia: any, keyboard?: any);
      richMedia: any;
    }
  }
}
