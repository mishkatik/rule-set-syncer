import { env } from '@config';
import type { SyncSummary } from '@core/syncer';
import { formatBytes, ts } from '@utils';
import { Api } from 'grammy';

interface TelegramTarget {
  api: Api;
  chatId: number | string;
  /** Optional forum topic (message thread) to post into. */
  topicId?: number;
}

/** Telegram chat ids are numeric (incl. negative supergroup ids); channels use `@name`. */
function normalizeChatId(raw: string): number | string {
  return /^-?\d+$/.test(raw) ? Number(raw) : raw;
}

/**
 * Builds the Telegram target from env once at startup. Returns null when
 * notifications are disabled, warning if the config is only half-filled.
 */
function initTelegram(): TelegramTarget | null {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token && !chatId) return null;

  if (!token || !chatId) {
    console.warn(
      `[${ts()}] [telegram] Disabled — both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required.`
    );
    return null;
  }

  console.log(`[${ts()}] [telegram] Notifications enabled.`);
  return {
    api: new Api(token),
    chatId: normalizeChatId(chatId),
    topicId: env.TELEGRAM_TOPIC_ID,
  };
}

const target = initTelegram();

/** Escapes the three characters that are special in Telegram's HTML parse mode. */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Renders a titled bullet list, capping long lists with an "…and N more" line. */
function section(title: string, lines: string[]): string {
  if (lines.length === 0) return '';
  const MAX = 25;
  const shown = lines.slice(0, MAX);
  const extra = lines.length - shown.length;
  const more = extra > 0 ? `\n• <i>…and ${extra} more</i>` : '';
  return `\n\n<b>${title}</b>\n${shown.join('\n')}${more}`;
}

/** Formats a one-message HTML summary of a sync run. */
function buildMessage(summary: SyncSummary): string {
  const { uploaded, unchanged, failed, elapsedMs } = summary;
  const elapsed = (elapsedMs / 1000).toFixed(1);
  const headline = failed.length === 0 ? '✅' : '⚠️';

  const stats = `📤 <b>${uploaded.length}</b> uploaded · ⏭ <b>${unchanged.length}</b> unchanged · ❌ <b>${failed.length}</b> failed`;

  const updated = section(
    'Updated',
    uploaded.map(
      r => `• <code>${escapeHtml(r.name)}</code> — ${formatBytes(r.bytes)}`
    )
  );

  const errors = section(
    'Failed',
    failed.map(
      f =>
        `• <code>${escapeHtml(f.name)}</code> — ${escapeHtml(truncate(f.message, 160))}`
    )
  );

  return `${headline} <b>Rule-Set Syncer</b>\n\n${stats}\n⏱ ${elapsed}s${updated}${errors}`;
}

/**
 * Sends a single, consolidated Telegram message summarising a sync run.
 *
 * To avoid spam, no message is sent when nothing changed and nothing failed
 * (i.e. every source was already up to date). Notification failures are logged
 * and swallowed — they never interrupt or fail the sync.
 */
export async function notifySync(summary: SyncSummary): Promise<void> {
  if (!target) return;
  if (summary.uploaded.length === 0 && summary.failed.length === 0) return;

  try {
    await target.api.sendMessage(target.chatId, buildMessage(summary), {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(target.topicId !== undefined
        ? { message_thread_id: target.topicId }
        : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${ts()}] [telegram] Failed to send notification: ${msg}`);
  }
}
