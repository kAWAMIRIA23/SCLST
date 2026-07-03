# One-time: enable web + scaffold web/ folder (safe to re-run)
flutter create . --org ug.slcts --project-name slcts_driver --platforms=web

flutter run -d chrome `
  --dart-define=BASE_URL=http://localhost:3001 `
  --dart-define=WS_URL=ws://localhost:4000/telemetry
