import { getCurrentCharacterCardName_ACU } from '../../shared/template-preset-utils';
import { isSummaryOrOutlineTable_ACU, logDebug_ACU, logWarn_ACU } from '../../shared/utils';
import { getChatArray_ACU, saveChatToHost_ACU } from '../chat/chat-service';
import { currentChatFileIdentifier_ACU, currentJsonTableData_ACU, getCurrentIsolationKey_ACU } from '../runtime/state-manager';
import { readIsolatedTagData_ACU, writeIsolatedTagData_ACU } from '../../data/repositories/chat-message-data-repo';
import { clearVectorIndexTempCache_ACU, deleteVectorIndexCacheByIndex_ACU } from '../../data/storage/vector-index-temp-cache';
import { clearSummaryVectorFlushTasksByScope_ACU, clearSummaryVectorHotCache_ACU, deleteSummaryVectorHotCacheByIndex_ACU, deleteSummaryVectorHotCacheByScope_ACU } from '../../data/storage/vector-index-hot-cache';
import { buildLegacyVectorIndexSingleSnapshotFilePath_ACU, buildVectorIndexSingleSnapshotFilePath_ACU, readVectorIndexJsonFile_ACU } from '../../data/storage/vector-index-st-files-storage';
import { assignSummaryVectorIndexStateToTagData_ACU, getAggregatedSummaryVectorIndexSnapshot_ACU, getLatestSummaryVectorIndexSnapshotState_ACU } from './summary-vector-index-state-service';
import { cleanupUnreachableSummaryVectorIndexFiles_ACU, loadSummaryVectorIndexChunksFromManifest_ACU } from './summary-vector-index-storage-service';

export interface SummaryVectorIndexCachePreloadResult_ACU {
    success: boolean;
    skipped: boolean;
    reason?: string;
    chunkCount: number;
    indexId?: string;
    error?: string;
    cacheCleared?: boolean;
    chatStateCleared?: boolean;
}

function normalizeErrorMessage_ACU(error: unknown): string {
    if (error instanceof Error) return error.message || error.name || '未知错误';
    if (typeof error === 'string') return error;
    try {
        const json = JSON.stringify(error);
        return json && json !== '{}' ? json : String(error || '未知错误');
    } catch (_jsonError) {
        return String(error || '未知错误');
    }
}

export function isMissingExternalVectorFileError_ACU(message: string): boolean {
    const text = String(message || '').toLowerCase();
    const isVectorFileReadFailure = text.includes('交火向量索引分片读取失败')
        || text.includes('交火向量索引内容块读取失败');
    return isVectorFileReadFailure
        && (text.includes('404') || text.includes('not found') || text.includes('读取失败'));
}

export async function clearSummaryVectorIndexTempCache_ACU(): Promise<void> {
    await clearVectorIndexTempCache_ACU();
    await clearSummaryVectorHotCache_ACU();
}

function getCurrentSummaryVectorIndexSourceTableKey_ACU(): string {
    const tables = currentJsonTableData_ACU && typeof currentJsonTableData_ACU === 'object'
        ? currentJsonTableData_ACU
        : null;
    if (!tables) return 'summary';
    return Object.keys(tables).find((key) => {
        const table = tables[key];
        return !!table?.name && isSummaryOrOutlineTable_ACU(String(table.name || ''));
    }) || 'summary';
}

export async function tryRecoverSummaryVectorIndexFromExternalSnapshot_ACU(): Promise<boolean> {
    const chatKey = String(currentChatFileIdentifier_ACU || '').trim();
    const isolationKey = String(getCurrentIsolationKey_ACU() || '').trim();
    if (!chatKey || !isolationKey) return false;

    const candidateTableKeys = new Set<string>();
    candidateTableKeys.add(getCurrentSummaryVectorIndexSourceTableKey_ACU());
    candidateTableKeys.add('summary');

    const tables = currentJsonTableData_ACU && typeof currentJsonTableData_ACU === 'object'
        ? currentJsonTableData_ACU
        : null;
    if (tables) {
        for (const key of Object.keys(tables)) {
            const table = tables[key];
            if (table?.name && isSummaryOrOutlineTable_ACU(String(table.name || ''))) {
                candidateTableKeys.add(key);
            }
        }
    }

    const chatName = getCurrentCharacterCardName_ACU();

    for (const sourceTableKey of candidateTableKeys) {
        try {
            const namedPath = buildVectorIndexSingleSnapshotFilePath_ACU({ chatKey, isolationKey, sourceTableKey, chatName });
            const unnamedPath = buildVectorIndexSingleSnapshotFilePath_ACU({ chatKey, isolationKey, sourceTableKey });
            let loaded = await readVectorIndexJsonFile_ACU<{
                schema: string;
                manifest: any;
                rows: any[];
                chunks: any[];
            }>(namedPath);

            if ((!loaded.ok || !loaded.data || loaded.data.schema !== 'single_file_snapshot') && namedPath !== unnamedPath) {
                loaded = await readVectorIndexJsonFile_ACU<{
                    schema: string;
                    manifest: any;
                    rows: any[];
                    chunks: any[];
                }>(unnamedPath);
            }

            if (!loaded.ok || !loaded.data || loaded.data.schema !== 'single_file_snapshot') {
                const legacyPath = buildLegacyVectorIndexSingleSnapshotFilePath_ACU({ chatKey, isolationKey, sourceTableKey });
                if (legacyPath !== namedPath && legacyPath !== unnamedPath) {
                    loaded = await readVectorIndexJsonFile_ACU<{
                        schema: string;
                        manifest: any;
                        rows: any[];
                        chunks: any[];
                    }>(legacyPath);
                }
            }

            if (!loaded.ok || !loaded.data || loaded.data.schema !== 'single_file_snapshot') continue;

            const blob = loaded.data;
            const manifest = blob.manifest;
            if (!manifest?.indexId || manifest.status !== 'ready') continue;

            const chat = getChatArray_ACU();
            if (!Array.isArray(chat) || chat.length === 0) continue;

            let targetIndex = -1;
            for (let i = chat.length - 1; i >= 0; i--) {
                if (chat[i] && !chat[i].is_user) {
                    targetIndex = i;
                    break;
                }
            }
            if (targetIndex < 0) continue;

            const message = chat[targetIndex];
            const tagData = readIsolatedTagData_ACU(message, isolationKey) || {
                independentData: {},
                modifiedKeys: [],
                updateGroupKeys: [],
            };
            if (tagData.summaryVectorIndexState?.manifest?.indexId) return false;

            const rows = Array.isArray(blob.rows) ? blob.rows : [];
            const chunks = Array.isArray(blob.chunks) ? blob.chunks : [];
            assignSummaryVectorIndexStateToTagData_ACU(tagData, {
                manifest,
                rows,
                chunks,
                rowCount: rows.filter((row: any) => row.status !== 'removed').length,
                chunkCount: chunks.length,
                snapshotMessageId: String(manifest.snapshotMessageId || message.mesId || ''),
                sourceTableKey: String(manifest.sourceTableKey || sourceTableKey),
                sourceTableName: String(manifest.sourceTableName || sourceTableKey),
                indexedAt: String(manifest.indexedAt || new Date().toISOString()),
                skippedRowCount: 0,
            });
            writeIsolatedTagData_ACU(message, isolationKey, tagData);
            await saveChatToHost_ACU();
            logDebug_ACU(`[ACU交火向量索引] 已从外部快照自动恢复 state 到消息 #${targetIndex}（indexId=${manifest.indexId}，${rows.length} 行，${chunks.length} 块，sourceTableKey=${sourceTableKey}）`);
            return true;
        } catch {
            // 尝试下一个 sourceTableKey。
        }
    }

    return false;
}

export async function deleteCurrentSummaryVectorIndexForCurrentChat_ACU(): Promise<boolean> {
    const snapshot = getAggregatedSummaryVectorIndexSnapshot_ACU();
    const chat = getChatArray_ACU();
    const scopeHints = new Map<string, { chatKey?: string; isolationKey: string; sourceTableKey: string }>();
    let changed = false;

    if (snapshot?.layers?.length) {
        for (const layer of snapshot.layers) {
            const message = chat[layer.messageIndex];
            if (!message || message.is_user) continue;
            const tagData = readIsolatedTagData_ACU(message, layer.isolationKey);
            if (!tagData) continue;
            const manifest = tagData.summaryVectorIndexManifest || tagData.summaryVectorIndexState?.manifest || null;
            if (manifest) {
                const hint = {
                    chatKey: manifest.chatKey || currentChatFileIdentifier_ACU,
                    isolationKey: manifest.isolationKey || layer.isolationKey,
                    sourceTableKey: manifest.sourceTableKey || getCurrentSummaryVectorIndexSourceTableKey_ACU(),
                };
                scopeHints.set(`${hint.chatKey || ''}\n${hint.isolationKey}\n${hint.sourceTableKey}`, hint);
            }
            assignSummaryVectorIndexStateToTagData_ACU(tagData, null);
            writeIsolatedTagData_ACU(message, layer.isolationKey, tagData);
            changed = true;
        }
    }

    if (changed) {
        await saveChatToHost_ACU();
    }

    const scopeHintList = Array.from(scopeHints.values());
    for (const hint of scopeHintList) {
        await deleteSummaryVectorHotCacheByScope_ACU(hint);
        await clearSummaryVectorFlushTasksByScope_ACU(hint);
    }

    const gcResult = await cleanupUnreachableSummaryVectorIndexFiles_ACU({ scopeHints: scopeHintList });
    return changed || gcResult.deletedPaths.length > 0 || gcResult.failedDeletes.length > 0;
}

export async function clearLatestSummaryVectorIndexStateForMissingExternalFiles_ACU(params: {
    messageIndex: number;
    isolationKey: string;
    indexId: string;
}): Promise<boolean> {
    void params.messageIndex;
    void params.isolationKey;
    await deleteVectorIndexCacheByIndex_ACU(params.indexId);
    await deleteSummaryVectorHotCacheByIndex_ACU(params.indexId);
    return false;
}

export async function clearLatestSummaryVectorIndexStateForInvalidExternalFiles_ACU(params: {
    messageIndex: number;
    isolationKey: string;
    indexId: string;
}): Promise<boolean> {
    void params.messageIndex;
    void params.isolationKey;
    await deleteVectorIndexCacheByIndex_ACU(params.indexId);
    await deleteSummaryVectorHotCacheByIndex_ACU(params.indexId);
    return false;
}

export function isInvalidExternalVectorFileError_ACU(message: string): boolean {
    const text = String(message || '').toLowerCase();
    return text.includes('交火向量索引分片身份不匹配')
        || text.includes('交火向量索引分片校验失败')
        || text.includes('交火向量索引内容块身份不匹配')
        || text.includes('交火向量索引内容块校验失败');
}

export async function preloadSummaryVectorIndexCacheForCurrentChat_ACU(): Promise<SummaryVectorIndexCachePreloadResult_ACU> {
    const snapshot = getLatestSummaryVectorIndexSnapshotState_ACU();
    const latestLayer = snapshot?.layers?.[0] || null;
    const manifest = snapshot?.summaryVectorIndexState?.manifest || null;
    if (!manifest) {
        return {
            success: true,
            skipped: true,
            reason: 'no_manifest',
            chunkCount: 0,
        };
    }

    if (manifest.status !== 'ready') {
        return {
            success: true,
            skipped: true,
            reason: `manifest_status_${manifest.status || 'unknown'}`,
            chunkCount: 0,
            indexId: manifest.indexId,
        };
    }

    try {
        const chunks = await loadSummaryVectorIndexChunksFromManifest_ACU(manifest, {
            preferExternalFiles: true,
        });
        logDebug_ACU(`[交火向量索引] 当前聊天向量缓存预热完成：indexId=${manifest.indexId}, chunks=${chunks.length}，已从外置文件恢复热缓存。`);
        return {
            success: true,
            skipped: false,
            chunkCount: chunks.length,
            indexId: manifest.indexId,
        };
    } catch (error) {
        const message = normalizeErrorMessage_ACU(error);
        if (isMissingExternalVectorFileError_ACU(message)) {
            const chatStateCleared = latestLayer
                ? await clearLatestSummaryVectorIndexStateForMissingExternalFiles_ACU({
                    messageIndex: latestLayer.messageIndex,
                    isolationKey: latestLayer.isolationKey,
                    indexId: manifest.indexId,
                })
                : false;
            logWarn_ACU('[交火向量索引] 当前聊天外置向量文件缺失，已清空对应缓存并保留聊天索引状态:', message);
            return {
                success: true,
                skipped: true,
                reason: 'external_files_missing_cache_cleared_state_retained',
                chunkCount: 0,
                indexId: manifest.indexId,
                error: message,
                cacheCleared: true,
                chatStateCleared,
            };
        }
        if (isInvalidExternalVectorFileError_ACU(message)) {
            const chatStateCleared = latestLayer
                ? await clearLatestSummaryVectorIndexStateForInvalidExternalFiles_ACU({
                    messageIndex: latestLayer.messageIndex,
                    isolationKey: latestLayer.isolationKey,
                    indexId: manifest.indexId,
                })
                : false;
            logWarn_ACU('[交火向量索引] 当前聊天外置向量文件校验失败，已清空对应缓存并保留聊天索引状态:', message);
            return {
                success: true,
                skipped: true,
                reason: 'external_files_invalid_cache_cleared_state_retained',
                chunkCount: 0,
                indexId: manifest.indexId,
                error: message,
                cacheCleared: true,
                chatStateCleared,
            };
        }
        logWarn_ACU('[交火向量索引] 当前聊天向量缓存预热失败:', message);
        return {
            success: false,
            skipped: false,
            reason: 'preload_failed',
            chunkCount: 0,
            indexId: manifest.indexId,
            error: message,
        };
    }
}
