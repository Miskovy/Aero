terraform {
  required_version = ">= 1.5.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45.0"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# SSH Key Resource
resource "hcloud_ssh_key" "default" {
  name       = "${var.server_name}-key"
  public_key = file(var.ssh_public_key_path)
}

# Production VPS Server Resource
resource "hcloud_server" "aero_control_plane" {
  name        = var.server_name
  image       = "ubuntu-24.04"
  server_type = var.server_type
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.default.id]
  user_data   = file("${path.module}/cloud-init.yaml")

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  labels = {
    environment = "production"
    app         = "aero-paas"
  }
}

# Production Primary Floating/Static IP
resource "hcloud_floating_ip" "aero_static_ip" {
  type          = "ipv4"
  home_location = var.location
  description   = "Static IPv4 for Aero PaaS Control Plane"
}

resource "hcloud_floating_ip_assignment" "aero_ip_assignment" {
  floating_ip_id = hcloud_floating_ip.aero_static_ip.id
  server_id      = hcloud_server.aero_control_plane.id
}
