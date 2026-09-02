/**
 * Keyboard application service
 *
 * Route → service → repository for keyboard CRUD and nested button operations.
 * ViberApiValidator, Validators, and ButtonAction stay as genuine domain logic.
 */

import { PaginationParams } from "@vbar/shared";
import { paginate } from "@/lib/api/paginate";
import { Keyboard } from "./Keyboard";
import { Button } from "./Button";
import { KeyboardRepository, KeyboardFilters } from "./KeyboardRepository";
import { ViberApiValidator } from "./lib/ViberApiValidator";
import {
  ActionType,
  TextSize,
  TextVAlign,
  TextHAlign,
  BgMediaType,
  OpenURLType,
  InternalBrowserConfig,
  InputFieldState,
} from "./types";
import { KeyboardDTO } from "./KeyboardDTO";
import { ButtonDTO } from "./ButtonDTO";

type ButtonCreateFields = Omit<ButtonDTO, "id" | "createdAt" | "updatedAt">;

export interface CreateKeyboardInput {
  Buttons: ButtonCreateFields[];
  DefaultHeight?: boolean;
  InputFieldState?: InputFieldState;
  BgColor?: string | null;
  humanReadableName: string;
  title?: string | null;
  isBroadcast?: boolean;
  hidden?: boolean;
  isTemplate?: boolean;
}

export interface UpdateKeyboardInput {
  Buttons?: ButtonCreateFields[];
  DefaultHeight?: boolean;
  InputFieldState?: InputFieldState;
  BgColor?: string | null;
  humanReadableName?: string;
  title?: string | null;
  isBroadcast?: boolean;
  hidden?: boolean;
  isTemplate?: boolean;
}

export interface ListKeyboardsFilters {
  hidden?: boolean;
  isBroadcast?: boolean;
  isTemplate?: boolean;
  search?: string;
}

export interface ListKeyboardsResult {
  keyboards: KeyboardDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateButtonInput {
  keyboardId: string;
  Columns?: number;
  Rows?: number;
  Text: string;
  TextColor: string;
  BgColor?: string | null;
  BgMedia?: string | null;
  BgMediaType?: BgMediaType;
  BgMediaScaleType?: string;
  BgLoop?: boolean;
  ActionType: ActionType;
  ActionBody: string;
  OpenURLType?: OpenURLType;
  InternalBrowser?: InternalBrowserConfig;
  TextVAlign?: TextVAlign;
  TextHAlign?: TextHAlign;
  TextSize?: TextSize;
  Silent?: boolean;
  isJson?: boolean;
}

export interface UpdateButtonInput {
  keyboardId: string;
  buttonIndex: number;
  Columns?: number;
  Rows?: number;
  Text?: string;
  TextColor?: string;
  BgColor?: string | null;
  BgMedia?: string | null;
  BgMediaType?: BgMediaType;
  BgMediaScaleType?: string;
  BgLoop?: boolean;
  ActionType?: ActionType;
  ActionBody?: string;
  OpenURLType?: OpenURLType;
  InternalBrowser?: InternalBrowserConfig;
  TextVAlign?: TextVAlign;
  TextHAlign?: TextHAlign;
  TextSize?: TextSize;
  Silent?: boolean;
  isJson?: boolean;
}

export interface ListButtonsFilters {
  actionType?: ActionType;
  search?: string;
}

export interface ListButtonsInput {
  keyboardId: string;
  filters?: ListButtonsFilters;
  pagination?: PaginationParams;
}

export interface ListButtonsResult {
  buttons: ButtonDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class KeyboardService {
  constructor(
    private readonly keyboardRepository: KeyboardRepository,
    private readonly viberApiValidator: ViberApiValidator
  ) {}

  async list(
    filters?: ListKeyboardsFilters,
    pagination?: PaginationParams
  ): Promise<ListKeyboardsResult> {
    const repositoryFilters: KeyboardFilters = {
      hidden: filters?.hidden,
      isBroadcast: filters?.isBroadcast,
      isTemplate: filters?.isTemplate,
      search: filters?.search,
    };

    const result = await this.keyboardRepository.findAll(
      repositoryFilters,
      pagination
    );

    return {
      keyboards: result.keyboards.map((keyboard) =>
        KeyboardDTO.fromEntity(keyboard)
      ),
      total: result.total,
      ...paginate(result.total, pagination),
    };
  }

  async get(id: string): Promise<KeyboardDTO> {
    const keyboard = await this.requireKeyboard(id);
    return KeyboardDTO.fromEntity(keyboard);
  }

  async create(input: CreateKeyboardInput): Promise<KeyboardDTO> {
    const keyboard = Keyboard.create({
      Buttons: input.Buttons.map((dto) => this.buttonFromCreateFields(dto)),
      DefaultHeight: input.DefaultHeight,
      InputFieldState: input.InputFieldState,
      BgColor: input.BgColor,
      hidden: input.hidden,
      humanReadableName: input.humanReadableName,
      title: input.title,
      isBroadcast: input.isBroadcast,
      isTemplate: input.isTemplate,
    });

    this.viberApiValidator.validateKeyboard(keyboard);
    const saved = await this.keyboardRepository.create(keyboard);
    return KeyboardDTO.fromEntity(saved);
  }

  async update(id: string, input: UpdateKeyboardInput): Promise<KeyboardDTO> {
    const existing = await this.requireKeyboard(id);

    const buttons =
      input.Buttons !== undefined
        ? input.Buttons.map((dto) => this.buttonFromCreateFields(dto))
        : existing.Buttons;

    const updated = this.cloneKeyboard(existing, {
      Buttons: buttons,
      DefaultHeight: input.DefaultHeight ?? existing.DefaultHeight,
      InputFieldState: input.InputFieldState ?? existing.InputFieldState,
      BgColor: input.BgColor !== undefined ? input.BgColor : existing.BgColor,
      hidden: input.hidden ?? existing.hidden,
      humanReadableName:
        input.humanReadableName ?? existing.humanReadableName,
      title: input.title !== undefined ? input.title : existing.title,
      isBroadcast: input.isBroadcast ?? existing.isBroadcast,
      isTemplate: input.isTemplate ?? existing.isTemplate,
    });

    this.viberApiValidator.validateKeyboard(updated);
    const saved = await this.keyboardRepository.update(id, updated);
    return KeyboardDTO.fromEntity(saved);
  }

  /**
   * Deletes a keyboard by ID.
   *
   * Orphan step references are allowed: a step may keep a deleted keyboard ID.
   * Viber's in-memory cache already skips missing keyboards.
   */
  async delete(id: string): Promise<void> {
    await this.requireKeyboard(id);
    await this.keyboardRepository.delete(id);
  }

  async addButton(input: CreateButtonInput): Promise<ButtonDTO> {
    const keyboard = await this.requireKeyboard(input.keyboardId);

    const button = Button.create({
      Columns: input.Columns ?? 1,
      Rows: input.Rows ?? 1,
      Text: input.Text,
      TextColor: input.TextColor,
      BgColor: input.BgColor,
      BgMedia: input.BgMedia,
      BgMediaType: input.BgMediaType,
      BgMediaScaleType: input.BgMediaScaleType,
      BgLoop: input.BgLoop,
      ActionType: input.ActionType,
      ActionBody: input.ActionBody,
      OpenURLType: input.OpenURLType,
      InternalBrowser: input.InternalBrowser,
      TextVAlign: input.TextVAlign,
      TextHAlign: input.TextHAlign,
      TextSize: input.TextSize,
      Silent: input.Silent,
      isJson: input.isJson,
    });

    this.viberApiValidator.validateButton(button);

    const updated = this.cloneKeyboard(keyboard, {
      Buttons: [...keyboard.Buttons, button],
    });
    const saved = await this.keyboardRepository.update(keyboard.id, updated);
    const savedButton = saved.Buttons.at(-1);
    if (!savedButton) {
      throw new Error("Failed to persist new button");
    }
    return ButtonDTO.fromEntity(savedButton);
  }

  async updateButton(input: UpdateButtonInput): Promise<ButtonDTO> {
    const keyboard = await this.requireKeyboard(input.keyboardId);
    this.assertButtonIndex(keyboard, input.buttonIndex);

    const updatedButton = this.mergeButtonUpdate(
      keyboard.Buttons[input.buttonIndex],
      input
    );
    this.viberApiValidator.validateButton(updatedButton);

    const updatedButtons = [...keyboard.Buttons];
    updatedButtons[input.buttonIndex] = updatedButton;
    const updated = this.cloneKeyboard(keyboard, { Buttons: updatedButtons });
    const saved = await this.keyboardRepository.update(keyboard.id, updated);
    return ButtonDTO.fromEntity(saved.Buttons[input.buttonIndex]);
  }

  async removeButton(keyboardId: string, buttonIndex: number): Promise<void> {
    const keyboard = await this.requireKeyboard(keyboardId);
    this.assertButtonIndex(keyboard, buttonIndex);

    if (keyboard.Buttons.length <= 1) {
      throw new Error(
        "Cannot delete button. Keyboard must have at least one button."
      );
    }

    const updated = this.cloneKeyboard(keyboard, {
      Buttons: keyboard.Buttons.filter((_, index) => index !== buttonIndex),
    });
    await this.keyboardRepository.update(keyboardId, updated);
  }

  async getButton(keyboardId: string, buttonIndex: number): Promise<ButtonDTO> {
    const keyboard = await this.requireKeyboard(keyboardId);
    this.assertButtonIndex(keyboard, buttonIndex);
    return ButtonDTO.fromEntity(keyboard.Buttons[buttonIndex]);
  }

  async listButtons(input: ListButtonsInput): Promise<ListButtonsResult> {
    const keyboard = await this.requireKeyboard(input.keyboardId);

    let buttons = keyboard.Buttons;
    if (input.filters?.actionType) {
      buttons = buttons.filter(
        (button) => button.ActionType === input.filters!.actionType
      );
    }
    if (input.filters?.search) {
      const searchLower = input.filters.search.toLowerCase();
      buttons = buttons.filter(
        (button) =>
          button.Text.toLowerCase().includes(searchLower) ||
          button.ActionBody.toLowerCase().includes(searchLower)
      );
    }

    const total = buttons.length;
    const { page, limit, totalPages } = paginate(total, input.pagination);
    const skip = (page - 1) * limit;

    return {
      buttons: buttons
        .slice(skip, skip + limit)
        .map((button) => ButtonDTO.fromEntity(button)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  private async requireKeyboard(id: string): Promise<Keyboard> {
    const keyboard = await this.keyboardRepository.findById(id);
    if (!keyboard) {
      throw new Error(`Keyboard with ID ${id} not found`);
    }
    return keyboard;
  }

  private assertButtonIndex(keyboard: Keyboard, buttonIndex: number): void {
    if (buttonIndex < 0 || buttonIndex >= keyboard.Buttons.length) {
      throw new Error(
        `Button index ${buttonIndex} is out of bounds. Keyboard has ${keyboard.Buttons.length} buttons.`
      );
    }
  }

  private buttonFromCreateFields(dto: ButtonCreateFields): Button {
    return Button.create({
      Columns: dto.Columns,
      Rows: dto.Rows,
      Text: dto.Text,
      TextColor: dto.TextColor,
      BgColor: dto.BgColor,
      BgMedia: dto.BgMedia,
      BgMediaType: dto.BgMediaType,
      BgMediaScaleType: dto.BgMediaScaleType,
      BgLoop: dto.BgLoop,
      ActionType: dto.ActionType,
      ActionBody: dto.ActionBody,
      OpenURLType: dto.OpenURLType,
      InternalBrowser: dto.InternalBrowser,
      TextVAlign: dto.TextVAlign,
      TextHAlign: dto.TextHAlign,
      TextSize: dto.TextSize,
      Silent: dto.Silent,
      isJson: dto.isJson,
    });
  }

  private mergeButtonUpdate(
    existing: Button,
    input: UpdateButtonInput
  ): Button {
    return new Button({
      id: existing.id,
      Columns: input.Columns ?? existing.Columns,
      Rows: input.Rows ?? existing.Rows,
      Text: input.Text ?? existing.Text,
      TextColor: input.TextColor ?? existing.TextColor,
      BgColor: input.BgColor !== undefined ? input.BgColor : existing.BgColor,
      BgMedia: input.BgMedia !== undefined ? input.BgMedia : existing.BgMedia,
      BgMediaType: input.BgMediaType ?? existing.BgMediaType,
      BgMediaScaleType: input.BgMediaScaleType ?? existing.BgMediaScaleType,
      BgLoop: input.BgLoop ?? existing.BgLoop,
      ActionType: input.ActionType ?? existing.ActionType,
      ActionBody: input.ActionBody ?? existing.ActionBody,
      OpenURLType: input.OpenURLType ?? existing.OpenURLType,
      InternalBrowser: input.InternalBrowser ?? existing.InternalBrowser,
      TextVAlign: input.TextVAlign ?? existing.TextVAlign,
      TextHAlign: input.TextHAlign ?? existing.TextHAlign,
      TextSize: input.TextSize ?? existing.TextSize,
      Silent: input.Silent ?? existing.Silent,
      isJson: input.isJson ?? existing.isJson,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  private cloneKeyboard(
    keyboard: Keyboard,
    overrides: {
      Buttons?: Button[];
      DefaultHeight?: boolean;
      InputFieldState?: InputFieldState;
      BgColor?: string | null;
      hidden?: boolean;
      humanReadableName?: string;
      title?: string | null;
      isBroadcast?: boolean;
      isTemplate?: boolean;
    }
  ): Keyboard {
    return new Keyboard({
      id: keyboard.id,
      type: keyboard.type,
      Buttons: overrides.Buttons ?? keyboard.Buttons,
      DefaultHeight: overrides.DefaultHeight ?? keyboard.DefaultHeight,
      InputFieldState: overrides.InputFieldState ?? keyboard.InputFieldState,
      BgColor:
        overrides.BgColor !== undefined ? overrides.BgColor : keyboard.BgColor,
      hidden: overrides.hidden ?? keyboard.hidden,
      humanReadableName:
        overrides.humanReadableName ?? keyboard.humanReadableName,
      title: overrides.title !== undefined ? overrides.title : keyboard.title,
      isBroadcast: overrides.isBroadcast ?? keyboard.isBroadcast,
      isTemplate: overrides.isTemplate ?? keyboard.isTemplate,
      createdAt: keyboard.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }
}
