# Fix for Issue #21

function handleSolanaLink(entryHash) {
  if (!entryHash || typeof entryHash !== 'string') return;
  const trimmed = entryHash.trim();
  if (trimmed.length < 32) return;
  try {
    new Uint8Array(Buffer.from(trimmed, 'hex'));
  } catch (e) {
    return;
  }
  window.open(`https://explorer.solana.com/address/${entryHash}`, '_blank');
}