// vite.config.js
import { defineConfig } from "file:///sessions/dazzling-wizardly-cori/mnt/mon-budget/budget-app/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/dazzling-wizardly-cori/mnt/mon-budget/budget-app/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///sessions/dazzling-wizardly-cori/mnt/mon-budget/budget-app/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icons/*.png"],
      manifest: {
        name: "BudgetApp",
        short_name: "BudgetApp",
        description: "G\xE9rez vos finances personnelles simplement et en toute s\xE9curit\xE9",
        theme_color: "#4F46E5",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/mon-budget/",
        start_url: "/mon-budget/",
        orientation: "portrait",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: "/mon-budget/index.html",
        navigateFallbackDenylist: [/^\/__/]
      }
    })
  ],
  // Base path pour GitHub Pages : https://juny31.github.io/mon-budget
  base: "/mon-budget/",
  server: {
    host: true,
    // expose sur le réseau local (0.0.0.0)
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvZGF6emxpbmctd2l6YXJkbHktY29yaS9tbnQvbW9uLWJ1ZGdldC9idWRnZXQtYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvZGF6emxpbmctd2l6YXJkbHktY29yaS9tbnQvbW9uLWJ1ZGdldC9idWRnZXQtYXBwL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy9kYXp6bGluZy13aXphcmRseS1jb3JpL21udC9tb24tYnVkZ2V0L2J1ZGdldC1hcHAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5wbmcnLCAnaWNvbnMvKi5wbmcnXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdCdWRnZXRBcHAnLFxuICAgICAgICBzaG9ydF9uYW1lOiAnQnVkZ2V0QXBwJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdHXHUwMEU5cmV6IHZvcyBmaW5hbmNlcyBwZXJzb25uZWxsZXMgc2ltcGxlbWVudCBldCBlbiB0b3V0ZSBzXHUwMEU5Y3VyaXRcdTAwRTknLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyM0RjQ2RTUnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgc2NvcGU6ICcvbW9uLWJ1ZGdldC8nLFxuICAgICAgICBzdGFydF91cmw6ICcvbW9uLWJ1ZGdldC8nLFxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICdpY29ucy9pY29uLTE5Mi5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnaWNvbnMvaWNvbi01MTIucG5nJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnkgbWFza2FibGUnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmd9J10sXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvbW9uLWJ1ZGdldC9pbmRleC5odG1sJyxcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9fXy9dLFxuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcbiAgLy8gQmFzZSBwYXRoIHBvdXIgR2l0SHViIFBhZ2VzIDogaHR0cHM6Ly9qdW55MzEuZ2l0aHViLmlvL21vbi1idWRnZXRcbiAgYmFzZTogJy9tb24tYnVkZ2V0LycsXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IHRydWUsICAgLy8gZXhwb3NlIHN1ciBsZSByXHUwMEU5c2VhdSBsb2NhbCAoMC4wLjAuMClcbiAgICBwb3J0OiA1MTczLFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1csU0FBUyxvQkFBb0I7QUFDN1gsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxlQUFlLENBQUMsZUFBZSxhQUFhO0FBQUEsTUFDNUMsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsT0FBTztBQUFBLFFBQ1AsV0FBVztBQUFBLFFBQ1gsYUFBYTtBQUFBLFFBQ2IsT0FBTztBQUFBLFVBQ0w7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxVQUNSO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBLFFBQ1AsY0FBYyxDQUFDLGdDQUFnQztBQUFBLFFBQy9DLGtCQUFrQjtBQUFBLFFBQ2xCLDBCQUEwQixDQUFDLE9BQU87QUFBQSxNQUNwQztBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQTtBQUFBLEVBRUEsTUFBTTtBQUFBLEVBQ04sUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
