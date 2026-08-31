# Nomos infrastructure

Infrastructure and deployment configuration belongs here: Skaffold, Firebase, DNS, environments, and infrastructure-as-code modules.

Keep infrastructure provider details out of `apps/*`. An app should provide identity and environment inputs; this directory owns provisioning and deployment conventions.
