module.exports = {
  apps: [
    {
      name: "storage-reorg-backend",
      script: "uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8070",
      cwd: "/home/aurelio/server_aplicativos/storage-reorg/backend",
      interpreter: "none",
      env: {
        PYTHONPATH: ".",
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: "storage-reorg-frontend",
      script: "npm",
      args: "run preview -- --port 3040 --host",
      cwd: "/home/aurelio/server_aplicativos/storage-reorg/frontend",
      interpreter: "none",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
