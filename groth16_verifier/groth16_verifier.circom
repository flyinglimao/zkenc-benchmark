pragma circom 2.0.3;

include "./groth16.circom";

// Groth16 verifier for simple multiplier circuit (1 public input)
// This circuit verifies a Groth16 proof inside another ZK circuit
component main = verifyProof(1);
