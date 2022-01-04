library(tidyverse)

re_dat <- tibble(
  pid = 1:1000,
  random_effect = rnorm(1000, 0, 0.5),
) %>%
  slice(rep(1:n(), each = 3)) %>%
  mutate(
    antigen = rep(1:3, times = 1000) %>% as.character(),
    logtitre_expected = log(20) + random_effect + if_else(antigen == "2", log(2), 0) + if_else(antigen == "3", log(3), 0),
    logtitre = rnorm(n(), logtitre_expected, 0.3)
  )

re_fit <- lme4::lmer(
  logtitre ~ antigen + (1 | pid),
  re_dat,
)

marginal_means <- emmeans::emmeans(re_fit, "antigen")
