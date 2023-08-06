@echo off
powershell.exe -Command "& {Start-Process cmd.exe -ArgumentList '/k title VoiceRecorder && cd /d %~dp0 && node voiceRecorder.js' -Verb RunAs}"
