## 🧠 System Architecture Overview

This project follows a modular, service-oriented architecture designed for scalability, performance, and real-time communication. The flow and interaction of services are outlined below using a Mermaid diagram.

### 📊 Architecture Diagram

```mermaid
graph TD
    %% Client and Entry Points
    CA[Client Apps<br/>Web/Mobile] --> LB[Load Balancer<br/>Nginx]
    LB --> AG[API Gateway<br/>Service]
    
    %% Main Orchestrator
    AG --> NS[Notification Service<br/>Main Orchestrator]
    
    %% Supporting Services
    NS --> TS[Template<br/>Service]
    NS --> UMS[User Management<br/>Service]
    NS --> MQ[Message Queue<br/>Redis]
    NS --> PS[Pub/Sub<br/>Redis]
    NS --> WS[WebSocket<br/>Service]
    
    %% Delivery Services
    MQ --> ES[Email<br/>Service]
    MQ --> SMS[SMS<br/>Service]
    MQ --> PN[Push Notification<br/>Service]
    
    PS --> ES
    PS --> SMS
    PS --> PN
    
    %% Data Layer
    NS --> PG[(PostgreSQL<br/>Primary DB)]
    NS --> RC[(Redis<br/>Cache)]
    NS --> ML[Monitoring<br/>& Logging]
    
    %% Styling
    classDef clientLayer fill:#e1f5fe
    classDef serviceLayer fill:#f3e5f5
    classDef deliveryLayer fill:#e8f5e8
    classDef dataLayer fill:#fff3e0
    
    class CA,LB,AG clientLayer
    class NS,TS,UMS,MQ,PS,WS serviceLayer
    class ES,SMS,PN deliveryLayer
    class PG,RC,ML dataLayer
````

### 🔍 Explanation

#### 🧑‍💻 Client Layer

* **Client Apps (Web/Mobile)**: Users interact via responsive web or mobile apps.
* **Load Balancer (Nginx)**: Distributes incoming requests efficiently across API instances.
* **API Gateway**: Central entry point for routing, authentication, and request aggregation.

#### 🧩 Service Layer

* **Notification Service (Main Orchestrator)**: Core logic that orchestrates different notification types.
* **Template Service**: Manages notification templates (email, SMS, push).
* **User Management Service**: Handles authentication, user preferences, and roles.
* **Message Queue (Redis)**: Temporary job storage for reliable message delivery.
* **Pub/Sub (Redis)**: Enables real-time event-based communication between services.
* **WebSocket Service**: Facilitates real-time client-server interactions (e.g., live updates).

#### 🚚 Delivery Layer

* **Email Service**: Sends out transactional or bulk emails.
* **SMS Service**: Sends mobile text notifications.
* **Push Notification Service**: Sends app-based push alerts (e.g., FCM, APNs).

#### 🗄️ Data Layer

* **PostgreSQL**: Primary relational database for storing user data, templates, and logs.
* **Redis Cache**: Improves performance by caching frequently accessed data.
* **Monitoring & Logging**: Tracks application health, logs errors and usage metrics.


### ✅ Key Features

* ⚙️ Microservice-ready and independently scalable
* 🧵 Supports both synchronous (HTTP) and asynchronous (Redis Queue, Pub/Sub) communication
* 📡 Real-time delivery via WebSocket and push notifications
* 🧠 Separation of concerns for better maintainability and testing
