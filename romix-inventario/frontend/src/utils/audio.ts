export const playFeedback = (success: boolean) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = success ? 'sine' : 'square';
    oscillator.frequency.value = success ? 880 : 220;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + (success ? 0.12 : 0.22));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (success ? 0.12 : 0.22));
  } catch {
    // El audio es una mejora no critica y algunos navegadores pueden bloquearlo.
  }
};

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
