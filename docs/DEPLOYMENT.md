# WorryBox Production Deployment Guide

This guide covers the complete production deployment and monitoring setup for WorryBox.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured with DNS pointing to your server
- SSL certificates (handled automatically by Traefik + Let's Encrypt)
- Server with at least 4GB RAM and 20GB storage

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd worrybox
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your actual values
   ```

3. **Deploy**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

## Detailed Setup

### 1. Environment Configuration

Copy and configure the production environment file:

```bash
cp .env.example .env.production
```

Key configurations to update:

- `DOMAIN`: Your domain name
- `POSTGRES_PASSWORD`: Secure database password
- `JWT_SECRET`: Secure JWT secret (32+ characters)
- `OPENAI_API_KEY`: Your OpenAI API key
- `EMAIL_*`: SMTP configuration for emails
- `LEMONSQUEEZY_*`: Payment processing configuration

### 2. DNS Configuration

Configure your DNS records:

```
A     @              -> YOUR_SERVER_IP
A     api            -> YOUR_SERVER_IP
A     grafana        -> YOUR_SERVER_IP
A     prometheus     -> YOUR_SERVER_IP
CNAME traefik        -> YOUR_DOMAIN
```

### 3. Server Setup

Ensure your server has:

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM
- At least 20GB free disk space
- Ports 80 and 443 open

### 4. Deployment

Run the deployment script:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script will:
- Create a database backup (if existing)
- Build Docker images
- Start all services
- Perform health checks
- Clean up old resources

## Services Overview

### Core Application
- **Frontend**: React application served by Nginx
- **Backend**: Node.js API server
- **Database**: PostgreSQL with automated backups
- **Cache**: Redis for session storage and caching

### Infrastructure
- **Traefik**: Reverse proxy with automatic SSL
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards
- **Loki**: Log aggregation
- **Promtail**: Log collection

## Monitoring and Alerting

### Access Monitoring

- **Grafana**: https://grafana.your-domain.com
  - Username: admin
  - Password: Set in GRAFANA_PASSWORD

- **Prometheus**: https://prometheus.your-domain.com

### Key Metrics

The system monitors:
- Application health and uptime
- Database performance and connections
- Memory and CPU usage
- HTTP response times and error rates
- SSL certificate expiry
- Disk space usage

### Alerts

Alerts are configured for:
- Application downtime
- High resource usage
- Database issues
- SSL certificate expiry
- High error rates

## Backup and Recovery

### Automated Backups

Database backups run automatically:

```bash
# Manual backup
./scripts/backup-database.sh

# Restore from backup
./scripts/restore-database.sh /backups/backup_file.sql.gz
```

### Backup Schedule

- Daily database backups
- 7-day retention policy
- Compressed storage
- Optional cloud storage upload

## Maintenance

### Updating the Application

1. **Pull latest changes**
   ```bash
   git pull origin main
   ```

2. **Deploy updates**
   ```bash
   ./scripts/deploy.sh
   ```

### Scaling

To scale the application:

1. **Horizontal scaling**: Add more backend containers
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --scale backend=3
   ```

2. **Database scaling**: Consider read replicas for high load

### Log Management

Logs are centralized in Loki and accessible through Grafana:

- Application logs: `/var/log/worrybox/`
- Container logs: Automatically collected
- System logs: Collected by Promtail

## Security

### Security Features

- **HTTPS**: Automatic SSL certificates
- **Rate Limiting**: API rate limiting enabled
- **Security Headers**: Comprehensive security headers
- **Container Security**: Non-root containers
- **Network Isolation**: Docker network isolation

### Security Checklist

- [ ] Strong passwords for all services
- [ ] Regular security updates
- [ ] Firewall configured (ports 80, 443 only)
- [ ] SSH key authentication
- [ ] Regular backup testing
- [ ] SSL certificate monitoring

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.prod.yml logs backend
   
   # Check health
   curl http://localhost/health
   ```

2. **Database connection issues**
   ```bash
   # Check database status
   docker-compose -f docker-compose.prod.yml ps postgres
   
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs postgres
   ```

3. **SSL certificate issues**
   ```bash
   # Check Traefik logs
   docker-compose -f docker-compose.prod.yml logs traefik
   
   # Verify DNS configuration
   nslookup your-domain.com
   ```

### Health Checks

The application provides health check endpoints:

- **Simple**: `GET /health` (returns OK/UNHEALTHY)
- **Detailed**: `GET /api/health` (returns detailed status)

### Performance Monitoring

Monitor performance through:
- Grafana dashboards
- Application logs
- Database query performance
- Response time metrics

## CI/CD Pipeline

The GitHub Actions pipeline automatically:

1. **Tests**: Runs all tests on pull requests
2. **Security**: Scans for vulnerabilities
3. **Build**: Builds Docker images
4. **Deploy**: Deploys to production on main branch
5. **Notify**: Sends deployment notifications

### Required Secrets

Configure these GitHub secrets:

- `PRODUCTION_HOST`: Server IP address
- `PRODUCTION_USER`: SSH username
- `PRODUCTION_SSH_KEY`: SSH private key
- `PRODUCTION_DOMAIN`: Your domain name

## Support

For deployment issues:

1. Check the logs in Grafana
2. Review the troubleshooting section
3. Check GitHub Issues
4. Contact the development team

## Performance Optimization

### Database Optimization

- Regular VACUUM and ANALYZE
- Connection pooling
- Query optimization
- Index monitoring

### Application Optimization

- Redis caching
- Image optimization
- CDN for static assets
- Gzip compression

### Monitoring Optimization

- Log rotation
- Metric retention policies
- Dashboard optimization
- Alert tuning