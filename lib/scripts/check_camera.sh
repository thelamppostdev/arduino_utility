#!/bin/bash

log stream --predicate 'process == "kernel" && (eventMessage contains "AppleH13CamIn::power_off_hardware" || eventMessage contains "AppleH13CamIn::power_on_hardware")'
