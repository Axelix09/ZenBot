export function getButtonReply(msg) {
  const message = msg.message?.viewOnceMessage?.message || msg.message;
  if (!message) return null;
  const interactiveResponse = message.interactiveResponseMessage;
  if (interactiveResponse) {
    const native = interactiveResponse.nativeFlowResponseMessage;
    if (native?.paramsJson) {
      try {
        const parsed = JSON.parse(native.paramsJson);
        return { id: parsed.id || parsed.selectedId || parsed.selectedRowId || parsed.display_text, raw: parsed };
      } catch {}
    }
    return { id: native?.selectedRowId || native?.selectedId || native?.selectedDisplayText };
  }
  const nativeFlow = message.nativeFlowResponseMessage;
  if (nativeFlow?.paramsJson) {
    try {
      const parsed = JSON.parse(nativeFlow.paramsJson);
      return { id: parsed.id || parsed.selectedId || parsed.selectedRowId || parsed.display_text, raw: parsed };
    } catch {}
  }
  if (message.buttonsResponseMessage?.selectedButtonId) return { id: message.buttonsResponseMessage.selectedButtonId };
  const listReply = message.listMessage?.singleSelectReply || message.listResponseMessage?.singleSelectReply;
  if (listReply?.selectedRowId) return { id: listReply.selectedRowId };
  if (listReply?.selectedDisplayText) return { id: listReply.selectedDisplayText };
  if (message.templateButtonReplyMessage?.selectedId) return { id: message.templateButtonReplyMessage.selectedId };
  return null;
}
