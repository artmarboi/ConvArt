import sys
import socket
import urllib.request
import json
import ssl

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

orig_getaddrinfo = socket.getaddrinfo
dns_cache = {}

def resolve_doh(host):
    if not host or not isinstance(host, str):
        return None
    if host in dns_cache:
        return dns_cache[host]
    
    # 1) Direct IP DoH via Google 8.8.8.8 (no DNS resolution needed for DNS server itself)
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(
            f'https://8.8.8.8/resolve?name={host}&type=A',
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=3.5) as r:
            data = json.loads(r.read().decode('utf-8'))
            for a in data.get('Answer', []):
                if a.get('type') == 1 and 'data' in a:
                    ip = a['data']
                    dns_cache[host] = ip
                    return ip
    except Exception:
        pass

    # 2) Direct IP DoH via Cloudflare 1.1.1.1
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(
            f'https://1.1.1.1/dns-query?name={host}&type=A',
            headers={'Accept': 'application/dns-json', 'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=3.5) as r:
            data = json.loads(r.read().decode('utf-8'))
            for a in data.get('Answer', []):
                if a.get('type') == 1 and 'data' in a:
                    ip = a['data']
                    dns_cache[host] = ip
                    return ip
    except Exception:
        pass

    return None

def custom_getaddrinfo(host, port, *args, **kwargs):
    try:
        return orig_getaddrinfo(host, port, *args, **kwargs)
    except Exception:
        ip = resolve_doh(host)
        if ip:
            return orig_getaddrinfo(ip, port, *args, **kwargs)
        raise

socket.getaddrinfo = custom_getaddrinfo

if __name__ == '__main__':
    from yt_dlp import main
    sys.exit(main())
