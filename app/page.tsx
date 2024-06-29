"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// 更新类型定义
type AudioChunk = Blob;

const VoiceToText: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<AudioChunk[]>([]);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        audioChunks.current = [];
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Error accessing microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioElement.current && audioUrl) {
      audioElement.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setError('Error playing audio. Please try again.');
      });
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) {
      setError('No audio recorded. Please record audio first.');
      return;
    }
    if (!apiKey) {
      setError('Please enter your Groq API key.');
      return;
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-large-v3');
    formData.append('temperature', '0');
    formData.append('response_format', 'json');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: { text: string } = await response.json();
      setTranscription(data.text);
      setError(null);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      setError('Error transcribing audio. Please check your API key and try again.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Voice to Text</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">Groq API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your Groq API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div className="flex justify-center space-x-2">
          <Button onClick={startRecording} disabled={isRecording}>
            <Mic className="mr-2 h-4 w-4" /> Start Recording
          </Button>
          <Button onClick={stopRecording} disabled={!isRecording}>
            <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
          </Button>
        </div>
        {audioUrl && (
          <div className="flex flex-col items-center">
            <audio ref={audioElement} src={audioUrl} controls className="w-full" />
            <div className="flex space-x-2 mt-2">
              <Button onClick={transcribeAudio}>
                Transcribe
              </Button>
            </div>
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {transcription && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold">Transcription:</h3>
            <p className="mt-2 p-2 bg-gray-100 rounded-md">{transcription}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <VoiceToText />
    </main>
  );
}
