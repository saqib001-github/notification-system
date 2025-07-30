import dotenv from "dotenv";

dotenv.config();

export const config = {

	port: parseInt(process.env.PORT || '3000'),
	nodeEnv: process.env.NODE_ENV || 'development',

	database: {
		host: process.env.DB_HOST || 'localhost',
		port: parseInt(process.env.DB_PORT || '5432'),
		database: process.env.DB_NAME || 'notifications',
		username: process.env.DB_USER || 'postgres',
		password: process.env.DB_PASSWORD || 'password',
		ssl: process.env.DB_SSL === 'true',
		max: 20,
		edleTimeoutMillis: 30000,
		connextionTimeoutMillis: 2000
	},
	redis: {
		host:process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379'),
		password: process.env.REDIS_PASSWORD,
		db: parseInt(process.env.REDIS_DB || '0'),
		retryDelayOnFailure: 100,
		maxRetryPerRequest: 3,
		lazyconnect: true
	},
	jwt: {
		secret: process.env.JWT_SECRET || 'yout-super-secret-key',
		expiresIn: process.env.JWT_EXPIRES_IN || '24h'
	},
	email:{
		smtp:{
			host: process.env.SMTP_HOST || 'smtp.google.com',
			port: parseInt(process.env.SMTP_PORT || '587'),
			secure: process.env.SMTP_SECURE === 'true',
			auth: {
				user: process.env.SMTP_USER || '',
				pass: process.env.SMTP_PASS || ''
			}
		}
	},
	sms:{
		twilio: {
			accountSid: process.env.TWILIO_ACCOUNT_SID || '',
			authToken: process.env.TWILIO_AUTH_TOKEN || '',
			fromNumber: process.env.TWILIO_FROM_NUMBER || ''
		}
	},
	push: {
		fcm: {
			serverKey: process.env.FCM_SERVER_KEY || ''
		}
	}

};
