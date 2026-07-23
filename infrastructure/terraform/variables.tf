variable "server_name" {
  description = "Name of the production server instance"
  type        = string
  default     = "aero-production-control-plane"
}

variable "server_type" {
  description = "Instance type / size (e.g. cx22 for Hetzner, s-2vcpu-4gb for DigitalOcean, t3.medium for AWS)"
  type        = string
  default     = "cx22"
}

variable "location" {
  description = "Data center region / location"
  type        = string
  default     = "nbg1"
}

variable "domain_name" {
  description = "Primary domain name for the Aero PaaS platform (e.g. aero-cloud.app)"
  type        = string
  default     = "aero-cloud.app"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key for root access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "hcloud_token" {
  description = "Hetzner Cloud API Token (or equivalent provider token)"
  type        = string
  sensitive   = true
  default     = ""
}
