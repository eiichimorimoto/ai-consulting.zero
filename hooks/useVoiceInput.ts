'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { correctTranscript, getSpeechHints } from '@/lib/shared/voiceDictionary';

// Web Speech API type declarations
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventType {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventType {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionType {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  grammars?: unknown;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventType) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventType) => void) | null;
  onend: (() => void) | null;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
  enableAICorrection: boolean;
  setEnableAICorrection: (enabled: boolean) => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enableAICorrection, setEnableAICorrection] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);

    // Check browser support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowAny = window as any;
    if (!windowAny.webkitSpeechRecognition && !windowAny.SpeechRecognition) {
      setError('お使いのブラウザは音声認識に対応していません。Chrome、Edge、Safariをお試しください。');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = windowAny.webkitSpeechRecognition || windowAny.SpeechRecognition;
      if (!SpeechRecognitionAPI) {
        setError('音声認識APIが利用できません');
        return;
      }
      const recognition = new SpeechRecognitionAPI() as SpeechRecognitionType;

      recognition.lang = 'ja-JP';
      recognition.continuous = true; // Continue listening until stopped
      recognition.interimResults = true; // Show interim results

      // Add speech hints for better recognition of consulting terms
      const hints = getSpeechHints();
      if (hints.length > 0 && recognition.grammars) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const SpeechGrammarListAPI = windowAny.SpeechGrammarList || windowAny.webkitSpeechGrammarList;
          if (SpeechGrammarListAPI) {
            const grammarList = new SpeechGrammarListAPI();
            const grammar = `#JSGF V1.0; grammar terms; public <term> = ${hints.join(' | ')} ;`;
            grammarList.addFromString(grammar, 1);
            recognition.grammars = grammarList;
          }
        } catch {
          // Grammar list not supported, continue without it
          console.log('Speech grammar not supported, using basic recognition');
        }
      }

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: SpeechRecognitionEventType) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptResult = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptResult + ' ';
          } else {
            interimTranscript += transcriptResult;
          }
        }

        setTranscript((prev) => {
          // If we have a final result, append it to previous final results
          if (finalTranscript) {
            // Apply dictionary correction to final transcript
            const corrected = correctTranscript(finalTranscript);
            return prev + corrected;
          }
          // Otherwise, show interim result (no correction for interim)
          return prev + interimTranscript;
        });
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
        console.error('音声認識エラー:', event.error);

        let errorMessage = '音声認識でエラーが発生しました';
        switch (event.error) {
          case 'no-speech':
            errorMessage = '音声が検出されませんでした。もう一度お試しください。';
            break;
          case 'audio-capture':
            errorMessage = 'マイクにアクセスできません。マイクの設定を確認してください。';
            break;
          case 'not-allowed':
            errorMessage = 'マイクの使用が許可されていません。ブラウザの設定を確認してください。';
            break;
          case 'network':
            errorMessage = 'ネットワークエラーが発生しました。';
            break;
        }

        setError(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('音声認識の初期化エラー:', err);
      setError('音声認識を開始できませんでした');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    error,
    enableAICorrection,
    setEnableAICorrection,
  };
}
