output "server_public_ipv4" {
  description = "Public IPv4 address of the Aero PaaS server"
  value       = hcloud_server.aero_control_plane.ipv4_address
}

output "floating_static_ipv4" {
  description = "Reserved static IPv4 address"
  value       = hcloud_floating_ip.aero_static_ip.ip_address
}

output "ssh_command" {
  description = "Command to SSH into the provisioned Aero control plane"
  value       = "ssh root@${hcloud_server.aero_control_plane.ipv4_address}"
}

output "dashboard_url" {
  description = "Web Dashboard URL"
  value       = "http://${hcloud_server.aero_control_plane.ipv4_address}:3001"
}

output "api_url" {
  description = "NestJS Control Plane API URL"
  value       = "http://${hcloud_server.aero_control_plane.ipv4_address}:3000/api/v1"
}
