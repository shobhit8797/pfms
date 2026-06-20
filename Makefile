# PFMS — one-stop task runner for the web app, REST API, mobile app, and database.
# Run `make` or `make help` to see everything. Targets use Bun + Expo + Prisma.

# Auto-detect this machine's LAN IP so the mobile app (on a physical device) can
# reach the local backend. Override with: make mobile LAN_IP=10.0.0.5
LAN_IP ?= $(shell ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo localhost)
PORT   ?= 3000
API_URL = http://$(LAN_IP):$(PORT)

# Deployed backend (Vercel). Used by `make mobile-prod` so the phone talks to the
# live API instead of this machine. Override with: make mobile-prod PROD_API_URL=https://...
PROD_API_URL ?= https://pfms-chi.vercel.app

.DEFAULT_GOAL := help
.PHONY: help setup install mobile-install dev start build lint typecheck \
        mobile mobile-prod mobile-clear mobile-ios mobile-android mobile-web dev-all \
        db-generate db-migrate db-push db-studio db-deploy db-reset clean

## ----------------------------------------------------------------------------
## Setup
## ----------------------------------------------------------------------------

setup: install mobile-install ## Install all dependencies (web + mobile)
	@echo "\n✅ Setup complete. Run 'make dev' (backend) and 'make mobile' (app)."

install: ## Install web/backend dependencies (root workspace)
	bun install

mobile-install: ## Install mobile dependencies and align them to the Expo SDK
	cd mobile && bun install && bunx expo install --fix

## ----------------------------------------------------------------------------
## Web app + REST API (Next.js)
## ----------------------------------------------------------------------------

dev: ## Start the web app + REST API (dev server, default port 3000)
	bun run dev

build: ## Production build (runs prisma generate)
	bun run build

start: ## Start the production server (after `make build`)
	bun run start

lint: ## Lint the web/backend codebase
	bun run lint

typecheck: ## Type-check web + @pfms/shared (no emit)
	bunx tsc --noEmit

## ----------------------------------------------------------------------------
## Mobile app (Expo — iOS + Android)
## ----------------------------------------------------------------------------

mobile: ## Start Expo (QR for Expo Go) pointed at this machine's LAN backend
	@echo "→ API base URL: $(API_URL)  (make sure 'make dev' is running)"
	cd mobile && EXPO_PUBLIC_API_BASE_URL=$(API_URL) bunx expo start

mobile-prod: ## Start Expo (QR for Expo Go) pointed at the DEPLOYED Vercel backend
	@echo "→ API base URL: $(PROD_API_URL)  (deployed — no local backend needed)"
	cd mobile && EXPO_PUBLIC_API_BASE_URL=$(PROD_API_URL) bunx expo start --clear

mobile-clear: ## Start Expo with a cleared Metro cache (use after dependency/SDK changes)
	@echo "→ API base URL: $(API_URL)"
	cd mobile && EXPO_PUBLIC_API_BASE_URL=$(API_URL) bunx expo start --clear

mobile-ios: ## Start Expo and open the iOS simulator (requires Xcode + a simulator runtime)
	cd mobile && EXPO_PUBLIC_API_BASE_URL=http://localhost:$(PORT) bunx expo start --ios

mobile-android: ## Start Expo and open the Android emulator (10.0.2.2 = host localhost)
	cd mobile && EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:$(PORT) bunx expo start --android

mobile-web: ## Run the mobile app in a browser (quick smoke test)
	cd mobile && EXPO_PUBLIC_API_BASE_URL=http://localhost:$(PORT) bunx expo start --web

dev-all: ## Run the backend AND the Expo app together (Ctrl+C stops both)
	@echo "→ Starting backend on :$(PORT) and Expo (API $(API_URL))"
	@bun run dev & WEB_PID=$$!; \
	trap 'kill $$WEB_PID 2>/dev/null' INT TERM EXIT; \
	cd mobile && EXPO_PUBLIC_API_BASE_URL=$(API_URL) bunx expo start

## ----------------------------------------------------------------------------
## Database (Prisma)
## ----------------------------------------------------------------------------

db-generate: ## Generate the Prisma client
	bunx prisma generate

db-migrate: ## Create + apply a migration (dev). Usage: make db-migrate name=add_x
	bunx prisma migrate dev $(if $(name),--name $(name),)

db-push: ## Push the schema to the DB without a migration (dev only)
	bunx prisma db push

db-studio: ## Open Prisma Studio (DB browser GUI)
	bunx prisma studio

db-deploy: ## Apply pending migrations (production)
	bunx prisma migrate deploy

db-reset: ## ⚠️  Drop + recreate the dev database (DELETES ALL DATA)
	bunx prisma migrate reset

## ----------------------------------------------------------------------------
## Misc
## ----------------------------------------------------------------------------

clean: ## Remove build artifacts and caches (web .next + mobile .expo)
	rm -rf .next mobile/.expo mobile/dist

help: ## Show this help
	@echo "PFMS — available make targets:\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo "\nDetected LAN IP: $(LAN_IP)  →  mobile API: $(API_URL)"
	@echo "Override with:   make mobile LAN_IP=<ip> PORT=<port>"
