---
title: Updated Homelab Remote Management with WireGuard + VPS
description: Using outbound WireGuard connection to enable incoming traffic to my homelab
pubDate: 2026-09-14
heroImage: ../Images/updated_homelab_hero.avif
---

For remote management of my homelab, I was using a Cloudflare Tunnel, individual subdomains for the services I wanted to manage, and Nginx as a reverse proxy.

I was using an Ansible playbook that I needed to run every time I wanted to add a new management service or an application.

This setup worked, but it became increasingly difficult to maintain. Each service could have different requirements for remote access (web interfaces, SSH, RDP etc) which meant maintaining different configurations for each service.

Adding a new service typically required me to:

- Add the service and its parameters to a YAML configuration.
- Deploy the updated Ansible configuration.
- Configure Nginx.
- Create a new subdomain in Cloudflare.


> For more information, you can check the GitHub repositories: [App Proxy](https://github.com/atakan-erdonmez/homelab/tree/main/infrastructure/app_proxy) & [Management Proxy](https://github.com/atakan-erdonmez/homelab/tree/main/infrastructure/mgmt_proxy)

## Requirements

I wanted a more robust solution that would allow me to:

- Access my homelab as if I were on the local network
- Maintain proper security controls
- Access it from restricted networks such as offices, hotels, or cafes
- Avoid having to configure every individual service for remote access

I initially considered using Tailscale, since I was already using it as a backup connectivity solution. However, I wanted a solution that gave me more control over the network and could work in environments where traditional VPN protocols are restricted.

## Design Decisions

My home Internet connection is behind CGNAT. This means I cannot reliably use DDNS, port forwarding, or accept inbound connections directly from the Internet.

Therefore, the basic architecture needed to be based on an **outbound connection from my homelab to a VPS**.

My initial idea was to create a VM in my homelab that would establish a VPN connection to the VPS and act as an exit point into my home network. Client devices would then connect to the VPS and route their traffic through this VM. I planned to use WireGuard for this.

However, WireGuard itself can be blocked on some restricted networks. I therefore decided not to use it between my client devices and the VPS.

Instead, I use WireGuard only for the **VPS <--> homelab connection**, where I control both endpoints.

### Router Integration

While designing the VM-based solution, I realized that my MikroTik router already had built-in WireGuard capability. This allowed me to remove the VM completely.

I created a WireGuard interface on the VPS and configured it as the WireGuard peer, connecting to the VPS. The router already handles routing and firewalling for my internal networks, so putting the VPN client directly on the router simplified the architecture and reduced possible points of failure.

I created a WireGuard interface (`wg0`) on the router and configured the VPS as its peer.

![WireGuard Interface](../Images/wireguard_interface.avif)


![WireGuard Peer](../Images/wireguard_peer.avif)
### WireGuard Configuration

On the VPS, after the WireGuard server installation, I needed to adjust networking. I had specify the subnets that I should be able to reach on my homelab.

For this, I needed to adjust `AllowedIPs` block and putting the subnets that I will reach.

While researching `AllowedIPs`, I learned that these entries also act as routing information. So when I put the subnets in the `AllowedIPs` block, WireGuard tool wg-quick created the necessary routes in the kernel automatically, simplifying the management.

==I also enabled IP forwarding on the VPS.==

> [DefGuard's AllowedIPs Explained](https://defguard.net/blog/allowedips-explained) was particularly helpful for understanding how WireGuard's `AllowedIPs` works.

The resulting VPS configuration looks roughly like this:

```ini
[Interface]
Address = 10.50.0.1/24
ListenPort = 51820
PrivateKey = REDACTED

[Peer]
# MikroTik router
PublicKey = REDACTED
AllowedIPs = 10.50.0.2/32, 192.168.10.0/24, 192.168.20.0/24, 192.168.30.0/24, 192.168.40.0/24
```


### VPS Configuration

Beside WireGuard config, I needed to adjust couple more things on the VPS for allowing routing. I needed to
- Enable IP forwarding
- Adjust iptables for forwarding with wg0

For the IP forwarding, I enabled it persistently using the commands:
```
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

I also needed to enable forwarding in the iptables. Since both the incoming and outgoing connection uses wg0 interface, I used the command:

```
sudo iptables -A FORWARD -i wg0 -o wg0 -j ACCEPT
```

However, the VPN tunnel still wasn't allowing me to access homelab. The missing piece was the MikroTik firewall rules.

### Firewall Rules

Due to the default deny policy, in order to enable homelab access, I had to add two firewall rules:

1. Allow input traffic from the WireGuard interface.
2. Allow forwarding traffic from the WireGuard interface.

The first allows the VPS to communicate with the router itself, while the second allows traffic to be forwarded from the VPN into my homelab.

After adding these rules, I could successfully access my homelab from the VPS.
## Client-to-VPS Connection

At this point, I had solved the **VPS <-> homelab** side of the problem.

The remaining challenge was connecting client devices to the VPS.

Installing a WireGuard client on every device would have been straightforward, but it would not solve the problem of accessing the homelab from restricted networks where WireGuard traffic may be blocked.

So I decided to use an existing **Shadowsocks** server running on my VPS.

> Shadowsocks is an encrypted proxy protocol designed to tunnel traffic through networks where conventional VPN protocols may be blocked or restricted.

I had already deployed Shadowsocks on the VPS, so this required very little additional infrastructure.

Because the VPS itself has a route through the WireGuard interface to my homelab, traffic arriving through Shadowsocks can be forwarded to the homelab through the existing VPS -> MikroTik WireGuard tunnel.

The resulting path is:

```text
Client
   │
   │ Shadowsocks
   ▼
 VPS
   │
   │ WireGuard
   ▼
MikroTik Router
   │
   ├── VLAN 10 - Management
   ├── VLAN 20 - Private Services
   ├── VLAN 30 - Public Services
   └── VLAN 40 - Users
```

#### Windows Client and PAC File

For Windows clients, I wanted normal Internet traffic to continue using the local network while only traffic destined for my homelab went through Shadowsocks.

Instead of configuring the proxy globally, I used a PAC (Proxy Auto-Configuration) file.

The PAC file checks whether the destination belongs to my internal address space. If it does, the request is sent through the local Shadowsocks SOCKS5 proxy. Everything else goes directly to the Internet.

```javascript
function FindProxyForURL(url, host) {
    // Send homelab traffic through Shadowsocks
    if (isInNet(host, "192.168.0.0", "255.255.0.0")) {
        return "SOCKS5 127.0.0.1:1080; SOCKS 127.0.0.1:1080";
    }

    // Optional: internal DNS domains
    // if (dnsDomainIs(host, ".lab.example.com") ||
    //     shExpMatch(host, "*.local")) {
    //     return "SOCKS5 127.0.0.1:1080; SOCKS 127.0.0.1:1080";
    // }

    // Everything else uses the normal connection
    return "DIRECT";
}
```

This gives me split tunneling at the application layer: only traffic destined for my homelab is proxied.

#### What About Outline?

I also considered using Outline as the client/server solution.

It was attractive because it provides a relatively simple way to deploy and manage a Shadowsocks-based proxy. However, for my particular use case I wanted more control over the client-side proxy configuration and routing behavior.

Using Shadowsocks directly also allowed me to use the PAC file and keep the setup lightweight. So I kept the existing Shadowsocks deployment instead of introducing another management layer.

## Final Architecture

The final architecture is relatively simple:

- The **MikroTik router** establishes an outbound WireGuard connection to the VPS
- The **VPS** forward traffic to my homelab through the WireGuard tunnel
- The **VPS** runs a Shadowsocks server for client access
- Client devices connect to Shadowsocks when they need to access the homelab
- The MikroTik router handles the internal routing and firewalling



```text
					Internet
						 │
						 │
			┌──────▼──────┐
			│     VPS     │
			│             │
			│ Shadowsocks │
			│     │       │
			│ WireGuard    │
			└──────┬──────┘
						 │
						 │ Encrypted tunnel
						 │
			┌──────▼──────┐
			│  MikroTik   │
			│   Router    │
			└──────┬──────┘
						 │
	 ┌─────────┼─────────┐
	 │         │         │
 VLAN 10   VLAN 20   VLAN 30 ...
```

## Conclusion

Compared to my previous Cloudflare Tunnel + Nginx setup, this architecture removes a significant amount of service-specific configuration.

I no longer need to:

- Add every service to a YAML configuration.
- Run an Ansible playbook when adding a management service.
- Create a new Cloudflare subdomain.
- Configure Nginx for every new service.
- Deal with application-specific web proxy issues.

Instead, the network itself provides access to the homelab.

The biggest advantage is that I can now access my homelab from my VPS even when I'm on a restricted network. At the same time, the homelab does not expose any inbound ports to the Internet and does not require a dedicated VM for the VPN connection.

The result is a simpler architecture where the **router handles the network-level VPN connection**, while **Shadowsocks provides a flexible client-side access method** for networks where traditional VPNs may not work.



