# IP_Reporter
This bot simply repots your server ip. This can be useful for monitoring your home server.

Modify and place `ip_reporter.service` into an appropreate place as instructed within its comments
Copy `.env` and `metadata.json` from `ignored_files`. Change `.env`'s content to include your bot token, and keep the contents of `metadata.json` as it is.

## System commands
```
sudo systemctl daemon-reload && sudo systemctl stop ip_reporter.service && sudo systemctl start ip_reporter.service && sudo systemctl status ip_reporter.service

sudo journalctl -u ip_reporter.service
```