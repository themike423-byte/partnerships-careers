#!/bin/sh
if [ -f JOB_ALERTS_SETUP.md ]; then
  sed -i 's/re_QrCd6cxj_LKmkc9VaEGGnVBhEAtyvP9mr/your_resend_api_key_here/g' JOB_ALERTS_SETUP.md
fi

